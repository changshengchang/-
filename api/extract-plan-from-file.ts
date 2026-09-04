import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";
import JSZip from "jszip";
import { 
  extractPlanFromDocumentText, 
  extractTextFromDocBinaryArrayBuffer,
  extractTextFromDocxArrayBuffer 
} from "../src/utils/planExtractor";
import { extractTextFromPdfArrayBuffer } from "../src/utils/pdfExtractor";

function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

function cleanTextForAI(text: string): string {
  if (!text) return "";
  return text
    .replace(/\u0000/g, "")
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { fileName = "", fileType = "", fileBase64 = "", extractedText: preExtractedText = "" } = req.body || {};

    if (!fileBase64 && !preExtractedText) {
      return res.status(400).json({ success: false, error: "未提供檔案資料或文字內容" });
    }

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
    const isDoc = lowerName.endsWith(".doc") || detectedMime.includes("msword");
    const isDocx = lowerName.endsWith(".docx") || detectedMime.includes("wordprocessingml");
    const isPdf = lowerName.endsWith(".pdf") || detectedMime.includes("pdf");
    const isImage =
      detectedMime.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif|bmp)$/i.test(lowerName);
    const isTextFile =
      lowerName.endsWith(".txt") ||
      lowerName.endsWith(".md") ||
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".json") ||
      detectedMime.startsWith("text/");

    if (!extractedText && isDoc && buffer.length > 0) {
      try {
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const docText = extractTextFromDocBinaryArrayBuffer(arrayBuffer);
        if (docText && docText.trim().length > 10) {
          extractedText = docText.trim();
        }
      } catch (docErr) {
        console.warn("Direct doc binary extraction warning in Vercel function:", docErr);
      }
    } else if (!extractedText && isDocx && buffer.length > 0) {
      try {
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const docxText = await extractTextFromDocxArrayBuffer(arrayBuffer);
        if (docxText && docxText.trim().length > 10) {
          extractedText = docxText.trim();
        }
      } catch (docxErr) {
        console.warn("Direct docx extraction warning in Vercel function:", docxErr);
      }

      if (!extractedText) {
        try {
          const docxResult = await mammoth.extractRawText({ buffer });
          if (docxResult.value && docxResult.value.trim().length > 10) {
            extractedText = docxResult.value.trim();
          }
        } catch (mErr) {
          console.warn("Mammoth extraction warning in Vercel function:", mErr);
        }
      }
    } else if (!extractedText && isPdf && buffer.length > 0) {
      try {
        const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        const pdfText = await extractTextFromPdfArrayBuffer(arrayBuffer);
        if (pdfText && pdfText.trim().length > 10) {
          extractedText = pdfText.trim();
        }
      } catch (pdfErr) {
        console.warn("PDF extraction warning in Vercel function:", pdfErr);
      }
    } else if (!extractedText && isTextFile && buffer.length > 0) {
      extractedText = buffer.toString("utf-8");
    }

    extractedText = cleanTextForAI(extractedText);

    // Pre-calculate smart extraction from text so we have genuine values
    const smartParsed = extractPlanFromDocumentText(extractedText, fileName);

    const ai = getAiClient();

    if (ai) {
      try {
        const promptInstruction = `
你是一位具備頂尖公文與企劃文件解析能力的資深活動專案總監。
使用者上傳了一份活動計畫/實施計畫文件（檔案名稱：「${fileName || "活動計畫文件"}」）。

請仔細閱讀並精準擷取、梳理出以下核心資訊，輸出結構化繁體中文：
1. title: 活動主題名稱（請擷取文件中最完整且具體的正式活動名稱，如「苗栗縣三義鄉公所115年度親子活動實施計畫」，務必保留機關名、年度與實施計畫字樣，請勿簡化為泛稱）
2. date: 活動日期（從文件中精確抓取真實日期時間，若為民國年如 115 年 8 月 7 日，請轉換為西元年如「2026年8月7日」或保留確切日期，請去除「如遇天候或不可抗力」等附屬條款）
3. location: 活動地點 / 舉辦場地（從文件中精確抓取真實地點，若文中為「本機關辦公場所及本鄉西湖渡假村」，請結合主辦機關名稱解析為具體地點如「苗栗縣三義鄉公所辦公場所及西湖渡假村」）
4. organizer: 主辦單位 / 籌備團隊（從文件中抓取真實主辦/主責單位，若主辦單位僅寫處室如「人事室」，請結合機關全銜如「苗栗縣三義鄉公所（人事室）」）
5. planContent: 該次活動計畫內容與成果說明（請將文件中的活動目的宗旨、詳細流程安排、重要體驗行程、經費勻支與預期效益價值，梳理撰寫成一篇約 250-450 字結構完整、條理清晰、文筆通暢的專業繁體中文敘述）
6. preferredStyle: 依據活動性質推薦最合適之排版風格 ('magazine' | 'executive' | 'gallery' | 'chronicle')
7. preferredTheme: 依據活動調性推薦合適之主題色彩 ('slate' | 'indigo' | 'forest' | 'terracotta' | 'amber')
8. extractionNotes: 一句簡潔友善的辨識完成說明
`;
        const parts: any[] = [{ text: promptInstruction }];
        if (isPdf && pureBase64 && pureBase64.length < 4000000) {
          parts.push({
            inlineData: { mimeType: "application/pdf", data: pureBase64 },
          });
        } else if (isImage && pureBase64 && pureBase64.length < 4000000) {
          parts.push({
            inlineData: { mimeType: detectedMime || "image/jpeg", data: pureBase64 },
          });
        } else if (extractedText) {
          parts.push({
            text: `【檔案文字內容】：\n"""\n${extractedText.slice(0, 15000)}\n"""`,
          });
        }

        // Try gemini-3.8-flash, fallback to gemini-3.6-flash
        const modelsToTry = ["gemini-3.8-flash", "gemini-3.6-flash"];
        let responseText = "";

        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
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
                  required: ["title", "date", "location", "organizer", "planContent", "preferredStyle", "preferredTheme"],
                },
              },
            });
            if (response.text) {
              responseText = response.text.trim();
              break;
            }
          } catch (modelErr) {
            console.warn(`Model ${modelName} failed in Vercel function, trying fallback:`, modelErr);
          }
        }

        if (responseText) {
          const parsed = JSON.parse(responseText);
          // If smart rule parsed has concrete specific values and AI gave generic values, preserve concrete values
          const isGenericDate = (d: string) => !d || d.includes("近期") || d.includes("規劃中") || d.includes("（2026年）");
          const isGenericLoc = (l: string) => !l || l.includes("指定現場") || l.includes("待定");
          const isGenericOrg = (o: string) => !o || o.includes("籌劃小組") || o.includes("籌辦小組") || o.includes("籌辦委員會");

          const finalData = {
            ...parsed,
            date: isGenericDate(parsed.date) && !isGenericDate(smartParsed.date) ? smartParsed.date : parsed.date,
            location: isGenericLoc(parsed.location) && !isGenericLoc(smartParsed.location) ? smartParsed.location : parsed.location,
            organizer: isGenericOrg(parsed.organizer) && !isGenericOrg(smartParsed.organizer) ? smartParsed.organizer : parsed.organizer,
            planContent: (!parsed.planContent || parsed.planContent.length < 40 || parsed.planContent.includes("精心策劃並順利舉辦")) && smartParsed.planContent ? smartParsed.planContent : parsed.planContent,
          };

          return res.status(200).json({ success: true, data: finalData, engine: "gemini-ai" });
        }
      } catch (geminiErr: any) {
        console.warn("Gemini extraction warning in Vercel function:", geminiErr?.message);
      }
    }

    // High-precision Fallback extraction
    return res.status(200).json({ success: true, data: smartParsed, engine: "smart-rule-engine" });
  } catch (err: any) {
    console.error("Vercel extract endpoint error:", err);
    return res.status(500).json({ success: false, error: err?.message || "Internal server error" });
  }
}
