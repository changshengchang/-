import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import mammoth from "mammoth";
import JSZip from "jszip";
import { extractPlanFromDocumentText, extractTextFromDocxArrayBuffer } from "./src/utils/planExtractor";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;
function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Image proxy endpoint to bypass CORS and prevent tainted canvas
app.get("/api/proxy-image", async (req, res) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl || !imageUrl.startsWith("http")) {
      return res.status(400).json({ error: "Invalid image URL" });
    }
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch remote image" });
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buffer);
  } catch (err) {
    console.error("Image proxy error:", err);
    res.status(500).json({ error: "Failed to proxy image" });
  }
});

// Helper to clean and sanitize text for AI and regex parsing
function cleanTextForAI(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u0000/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

// Multi-tier text extractor for Word documents (.docx, .doc)
async function extractTextFromWordDocument(buffer: Buffer, fileName: string): Promise<string> {
  // Strategy 1: Direct OOXML parsing via JSZip (pure, comprehensive, table-aware)
  try {
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const extracted = await extractTextFromDocxArrayBuffer(arrayBuffer);
    if (extracted && extracted.trim().length > 10) {
      return extracted.trim();
    }
  } catch (zipErr: any) {
    console.warn("Direct docx extraction warning:", zipErr?.message);
  }

  // Strategy 2: Mammoth (Secondary for standard .docx)
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (result.value && result.value.trim().length > 10) {
      return result.value.trim();
    }
  } catch (docxErr: any) {
    console.warn("Mammoth docx extraction warning:", docxErr?.message);
  }

  // Strategy 3: Direct OOXML file scan via JSZip
  try {
    const zip = await JSZip.loadAsync(buffer);
    const xmlFiles = Object.keys(zip.files).filter(
      (f) =>
        f.startsWith("word/") &&
        (f.endsWith("document.xml") ||
          f.includes("header") ||
          f.includes("footer") ||
          f.includes("footnotes") ||
          f.includes("endnotes"))
    );

    let collectedText: string[] = [];
    for (const xmlFile of xmlFiles) {
      const xmlContent = await zip.files[xmlFile].async("string");
      const withNewlines = xmlContent
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:br[^>]*>/g, "\n")
        .replace(/<w:tab\/>/g, "  ");
      const matches = withNewlines.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
      if (matches) {
        const text = matches
          .map((m) => m.replace(/<[^>]+>/g, ""))
          .join("")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'");
        if (text.trim()) collectedText.push(text);
      }
    }

    if (collectedText.length > 0) {
      const combined = collectedText.join("\n").trim();
      if (combined.length > 10) {
        return combined;
      }
    }
  } catch (zipErr: any) {
    console.warn("JSZip docx fallback warning:", zipErr?.message);
  }

  // Strategy 4: Binary string scan for older .doc or RTF documents
  try {
    const utf16Str = buffer.toString("utf16le");
    const utf16Matches = utf16Str.match(/[\u4e00-\u9fa5\w\s.,;:?!，。、；：？！（）《》「」『』\-\/]{4,}/g);
    if (utf16Matches && utf16Matches.join(" ").length > 30) {
      return utf16Matches.join("\n").trim();
    }

    const utf8Str = buffer.toString("utf-8");
    const utf8Matches = utf8Str.match(/[\u4e00-\u9fa5\w\s.,;:?!，。、；：？！（）《》「」『』\-\/]{4,}/g);
    if (utf8Matches && utf8Matches.join(" ").length > 30) {
      return utf8Matches.join("\n").trim();
    }
  } catch (binErr: any) {
    console.warn("Binary text scan fallback warning:", binErr?.message);
  }

  return "";
}

// Multi-model Gemini caller with fallback to avoid 503 high-demand errors
async function callGeminiWithFallback(ai: GoogleGenAI, requestConfig: any) {
  // gemini-3.6-flash is highly stable; gemini-3.8-flash serves as alternate
  const models = ["gemini-3.6-flash", "gemini-3.8-flash"];
  let lastErr: any = null;

  for (const model of models) {
    try {
      const res = await ai.models.generateContent({
        ...requestConfig,
        model,
      });
      return res;
    } catch (err: any) {
      console.warn(`Model ${model} call encountered issue:`, err?.message || err);
      lastErr = err;
    }
  }
  throw lastErr;
}

// Endpoint: Extract event plan information from uploaded file (PDF, Word, Text, Image)
app.post("/api/extract-plan-from-file", async (req, res) => {
  try {
    const { fileName = "", fileType = "", fileBase64 = "", extractedText: preExtractedText = "" } = req.body;

    if (!fileBase64 && !preExtractedText) {
      return res.status(400).json({ success: false, error: "未提供檔案資料或文字內容" });
    }

    // Strip prefix if data URL
    let pureBase64 = fileBase64 || "";
    let detectedMime = fileType;
    if (pureBase64.includes(";base64,")) {
      const [header, data] = pureBase64.split(";base64,");
      pureBase64 = data;
      if (!detectedMime) {
        detectedMime = header.replace("data:", "");
      }
    }

    const buffer = pureBase64 ? Buffer.from(pureBase64, "base64") : Buffer.alloc(0);
    const lowerName = (fileName || "").toLowerCase();

    let extractedText = preExtractedText || "";
    let isDocx =
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".doc") ||
      detectedMime.includes("wordprocessingml") ||
      detectedMime.includes("msword");
    let isPdf = lowerName.endsWith(".pdf") || detectedMime.includes("pdf");
    let isImage =
      detectedMime.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|bmp)$/i.test(lowerName);
    let isTextFile =
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".json") ||
      detectedMime.startsWith("text/");

    // Handle Word .docx / .doc if not pre-extracted
    if (!extractedText && isDocx && buffer.length > 0) {
      extractedText = await extractTextFromWordDocument(buffer, fileName);
    } else if (!extractedText && isTextFile && buffer.length > 0) {
      extractedText = buffer.toString("utf-8");
    }

    extractedText = cleanTextForAI(extractedText);

    const ai = getAiClient();

    if (ai) {
      try {
        const promptInstruction = `
你是一位具備頂尖文件解析與企劃審閱能力的資深活動專案總監。
使用者上傳了一份活動企劃/企劃書文件（檔案名稱：「${fileName || "活動計畫文件"}」）。

請仔細閱讀並精準擷取、歸納出以下核心資訊，輸出結構化繁體中文：
1. title: 活動主題名稱（精準、完整、大器）
2. date: 活動日期（如：2026年9月15日 或 2026/08/10 - 2026/08/12，若文中無確切日期，請根據上下文推斷或填寫「近期規劃」）
3. location: 活動地點 / 舉辦場地（如：台北國際會議中心、線上研討會等，若無確切地點填寫「活動指定現場」）
4. organizer: 主辦單位 / 籌備團隊 / 執行小組
5. planContent: 活動計畫內容及成果說明（請將文件中的活動主旨背景、核心目標、流程進程、執行重點、各階段亮點或成果產出，梳理並整理成結構完整、條理分明、專業流暢的繁體中文完整說明，約 200-450 字）
6. preferredStyle: 依據活動性質推薦最合適之排版風格 ('magazine' | 'executive' | 'gallery' | 'chronicle')
7. preferredTheme: 依據活動調性推薦合適之主題色彩 ('slate' | 'indigo' | 'forest' | 'terracotta' | 'amber')
8. extractionNotes: 一句簡潔友善的辨識完成說明（如：「已成功從企劃文件擷取活動名稱、期程及各項成果精華」）
`;

        const parts: any[] = [{ text: promptInstruction }];

        if (isPdf) {
          parts.push({
            inlineData: {
              mimeType: "application/pdf",
              data: pureBase64,
            },
          });
        } else if (isImage) {
          parts.push({
            inlineData: {
              mimeType: detectedMime || "image/jpeg",
              data: pureBase64,
            },
          });
        } else if (extractedText) {
          parts.push({
            text: `【檔案文字內容】：\n"""\n${extractedText.slice(0, 15000)}\n"""`,
          });
        } else {
          // Unknown binary or raw text fallback
          const rawClean = cleanTextForAI(buffer.toString("utf-8")).slice(0, 8000);
          parts.push({
            text: `【檔案文字】：\n"""\n${rawClean}\n"""`,
          });
        }

        const response = await callGeminiWithFallback(ai, {
          contents: [{ role: "user", parts }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                date: { type: Type.STRING },
                location: { type: Type.STRING },
                organizer: { type: Type.STRING },
                planContent: { type: Type.STRING },
                preferredStyle: {
                  type: Type.STRING,
                  enum: ["magazine", "executive", "gallery", "chronicle"],
                },
                preferredTheme: {
                  type: Type.STRING,
                  enum: ["slate", "indigo", "forest", "terracotta", "amber"],
                },
                extractionNotes: { type: Type.STRING },
              },
              required: ["title", "date", "location", "organizer", "planContent"],
            },
          },
        });

        const parsed = JSON.parse(response.text?.trim() || "{}");
        if (parsed.title || parsed.planContent) {
          return res.json({ success: true, data: parsed });
        }
      } catch (aiErr: any) {
        console.warn("AI extraction encountered issue, falling back to smart local extractor:", aiErr?.message);
      }
    }

    // Fail-safe Smart Fallback extractor: Never let file extraction fail
    const fallbackParsed = fallbackExtractPlan(fileName, extractedText);
    return res.json({ success: true, data: fallbackParsed, note: "smart_local_engine" });
  } catch (err: any) {
    console.error("Error in /api/extract-plan-from-file:", err);
    // Even in outer catch, provide a graceful fallback result
    const emergencyPlan = fallbackExtractPlan(req.body?.fileName || "活動企劃書", "");
    return res.json({
      success: true,
      data: emergencyPlan,
      note: "emergency_fallback",
    });
  }
});

// Enhanced smart rule extractor for document text
function fallbackExtractPlan(fileName: string, text: string) {
  return extractPlanFromDocumentText(text, fileName);
}

// AI analysis and layout suggestion endpoint
app.post("/api/analyze-event", async (req, res) => {
  try {
    const {
      title,
      planContent,
      date,
      location,
      organizer,
      photoCount = 0,
      photos = [], // array of { id, name, dataUrl } (optional samples)
      preferredStyle = "magazine",
      keyMetrics: customKeyMetrics,
    } = req.body;

    const ai = getAiClient();

    // If Gemini client is available, invoke gemini-3.8-flash
    if (ai) {
      const metricsText = (Array.isArray(customKeyMetrics) && customKeyMetrics.length > 0)
        ? `\n【使用者手動輸入之關鍵績效指標 (請務必直接採用並保留)】:\n${customKeyMetrics.map((m: any) => `- ${m.label}: ${m.value}`).join("\n")}`
        : "";

      const promptText = `
你是一位頂級的活動策展總監兼專業圖文主編。請針對以下活動企劃與照片資訊，產出具備高質感雜誌報導、企業公務紀實成果報告風格的排版文字內容與結構化摘要。

【活動基本輸入資訊】
活動名稱: ${title || "未命名活動"}
活動日期: ${date || "近期"}
活動地點: ${location || "活動現場"}
主辦單位: ${organizer || "活動籌備團隊"}
上傳照片總數: ${photoCount} 張${metricsText}
活動計畫與內容描述:
"""
${planContent || "本次活動圓滿成功，全體成員積極參與，凝聚團隊共識，成效卓越。"}
"""

請以繁體中文輸出嚴謹且富有視覺節奏感的 JSON 結構，包含以下欄位：
1. headline: 精練醒目、大器具傳播力的主標題（約 12-20 字）
2. subtitle: 輔助副標題或策展理念一句話（約 20-35 字）
3. executiveSummary: 活動摘要說明，包含活動背景、核心行動與整體成果，寫成流暢且專業的 2 段文字（總計約 180-280 字）。
4. keyMetrics: 3 到 4 項核心成效數據或亮點指標（若上方有提供使用者手動輸入之關鍵績效指標，請務必完全採用並對應輸出；若未提供則從企劃萃取或生成合適的指標，每項含 label 與 value）。
5. highlights: 3 到 4 項活動亮點或執行重點，每項包含 title（約 6-10 字）與 description（約 30-50 字）。
6. photoCaptions: 為照片設計的建議圖說與對應角色分類。請提供剛好 ${Math.max(photoCount, 4)} 則建議圖說，每則包含 title（精簡標籤，如「精彩開場」、「團隊協作」、「專案成果」）以及 caption（細緻優雅的單張照片解說，約 15-30 字）。
7. quotes: 1 則適合做為雜誌或海報 Pull Quote 的精采引言（金句，約 20-40 字）。
8. recommendedLayout: 推薦的排版風格 ('magazine' | 'executive' | 'gallery' | 'chronicle')
9. recommendedColorTheme: 推薦的色彩主題 ('slate' | 'terracotta' | 'forest' | 'amber' | 'indigo')
10. conclusion: 總結與展望（約 60-90 字）
`;

      // Build contents parts (include up to 3 compressed preview images if provided)
      const parts: any[] = [];
      
      // If client provided some small images, we can attach up to 3 image parts
      if (Array.isArray(photos) && photos.length > 0) {
        const samplePhotos = photos.slice(0, 3);
        for (const p of samplePhotos) {
          if (p.dataUrl && p.dataUrl.includes(";base64,")) {
            const [header, base64Data] = p.dataUrl.split(";base64,");
            const mimeType = header.replace("data:", "");
            if (base64Data && base64Data.length < 4000000) { // < ~3MB
              parts.push({
                inlineData: {
                  mimeType: mimeType || "image/jpeg",
                  data: base64Data,
                },
              });
            }
          }
        }
      }

      parts.push({ text: promptText });

      const response = await callGeminiWithFallback(ai, {
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              executiveSummary: { type: Type.STRING },
              keyMetrics: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                  },
                  required: ["label", "value"],
                },
              },
              highlights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                  },
                  required: ["title", "description"],
                },
              },
              photoCaptions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    caption: { type: Type.STRING },
                  },
                  required: ["title", "caption"],
                },
              },
              quotes: { type: Type.STRING },
              recommendedLayout: { type: Type.STRING },
              recommendedColorTheme: { type: Type.STRING },
              conclusion: { type: Type.STRING },
            },
            required: [
              "headline",
              "subtitle",
              "executiveSummary",
              "keyMetrics",
              "highlights",
              "photoCaptions",
              "quotes",
            ],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      if (Array.isArray(customKeyMetrics) && customKeyMetrics.length > 0) {
        parsed.keyMetrics = customKeyMetrics;
      }
      return res.json({ success: true, data: parsed });
    }

    // Smart Fallback when GEMINI_API_KEY is not configured or in offline preview
    const fallbackData = generateSmartFallback({
      title,
      planContent,
      date,
      location,
      organizer,
      photoCount,
      preferredStyle,
      keyMetrics: customKeyMetrics,
    });
    return res.json({ success: true, data: fallbackData, note: "generated_via_smart_engine" });
  } catch (err: any) {
    console.error("Error in /api/analyze-event:", err);
    // Fallback gracefully so frontend always gets a complete layout
    const fallbackData = generateSmartFallback(req.body);
    return res.json({ success: true, data: fallbackData, errorNotice: err?.message });
  }
});

// Helper for generating high quality fallback content
function generateSmartFallback(body: any) {
  const title = body.title?.trim() || "跨界創新與卓越團隊成果展";
  const plan = body.planContent?.trim() || "";
  const count = Math.max(body.photoCount || 4, 4);
  const userMetrics = body.keyMetrics || body.customKeyMetrics;

  return {
    headline: title ? `${title}・精彩紀實與成果綜述` : "共創卓越：年度活動亮點與紀實精華",
    subtitle: plan.length > 20 ? plan.slice(0, 35) + "..." : "凝聚向心力・探索創新可能・邁向全新里程碑",
    executiveSummary: plan
      ? `本次活動聚焦於「${title}」，透過縝密的規劃與團隊的高效協同合作，順利落實各項環節。現場氛圍熱烈，參與者在多元互動與主題分享中深化了彼此的交流與默契。\n\n綜觀本次活動，不僅全面達成了預期的計畫目標，更激盪出跨領域的創新思維，為後續的長期發展與深化合作奠定了堅實的基礎。`
      : `本次活動匯聚多方力量與熱情參與，透過精心籌辦的豐富議程與互動體驗，創造了充實且極具啟發性的美好時光。\n\n全體與會者在歡笑與深度交流中共同見證了重要時刻，成果斐然，展現了無與倫比的凝聚力與執行力。`,
    keyMetrics: (Array.isArray(userMetrics) && userMetrics.length > 0)
      ? userMetrics
      : [
          { label: "活動滿意度", value: "98.5%" },
          { label: "亮點產出", value: "12 項" },
          { label: "全程參與率", value: "100%" },
          { label: "正面回饋", value: "50+ 則" },
        ],
    highlights: [
      {
        title: "主題啟動與願景交流",
        description: "由核心籌備團隊引言，明確本次計畫的核心理念，迅速激發全場共鳴與投入熱情。",
      },
      {
        title: "沉浸式互動與實務協作",
        description: "設計多階段動態體驗，讓參與者在實際演練與討論中激盪出許多極具價值的創意點子。",
      },
      {
        title: "成果匯整與榮耀時刻",
        description: "統整全場關鍵進度與動人剪影，共同慶賀階段性成就，留下珍貴的影像與回憶。",
      },
    ],
    photoCaptions: Array.from({ length: count }).map((_, idx) => {
      const titles = ["盛大啟幕", "專注投入", "靈感激盪", "團隊合力", "成果呈現", "榮耀紀念", "真摯笑容", "圓滿合影"];
      const captions = [
        "與會成員齊聚一堂，展現飽滿朝氣與期待。",
        "全神貫注於關鍵環節，紀錄深思與專注的動人瞬間。",
        "跨界交流激盪創新火花，現場討論氣氛熱烈無比。",
        "團隊齊心協力突破挑戰，展現緊密協作精神。",
        "精采展示具體成果，獲得全場一致喝采與肯定。",
        "留下珍貴紀錄，每一刻都凝聚著大家的用心與汗水。",
        "溫馨而真摯的互動瞬間，洋溢著豐收的喜悅。",
        "全體夥伴大合影，為本次精彩活動畫下完美句點。",
      ];
      return {
        title: titles[idx % titles.length],
        caption: captions[idx % captions.length],
      };
    }),
    quotes: "「每一次真誠的相聚與投入，都是推動我們持續向前的最美力量。」",
    recommendedLayout: body.preferredStyle || "magazine",
    recommendedColorTheme: "slate",
    conclusion: "本次活動圓滿落幕，感謝所有籌辦同仁與熱情參與夥伴的全力支持，期待未來攜手締造更多耀眼篇章！",
  };
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
