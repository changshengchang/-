import { GoogleGenAI, Type } from "@google/genai";
import mammoth from "mammoth";
import JSZip from "jszip";
import { 
  extractPlanFromDocumentText, 
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
    const isDocx =
      lowerName.endsWith(".docx") ||
      lowerName.endsWith(".doc") ||
      detectedMime.includes("wordprocessingml") ||
      detectedMime.includes("msword");
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

    if (!extractedText && isDocx && buffer.length > 0) {
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
你是一位具備頂尖文件解析與企劃審閱能力的資深活動專案總監。
使用者上傳了一份活動企劃/企劃書文件（檔案名稱：「${fileName || "活動計畫文件"}」）。

請仔細閱讀並精準擷取、歸納出以下核心資訊，輸出結構化繁體中文：
1. title: 活動主題名稱（精準、完整、大器）
2. date: 活動日期（如：2026年9月15日 或 113年10月20日 09:00-17:00，必須從文件中精確抓取真實日期時間）
3. location: 活動地點 / 舉辦場地（必須從文件中精確抓取真實地點或會議室）
4. organizer: 主辦單位 / 籌備團隊（必須從文件中抓取真實主辦/指導單位）
5. planContent: 活動計畫內容及成果說明（梳理並整理成結構完整、條理分明、專業流暢的繁體中文說明，約 200-450 字）
6. preferredStyle: 依據活動性質推薦最合適之排版風格 ('magazine' | 'executive' | 'gallery' | 'chronicle')
7. preferredTheme: 依據活動調性推薦合適之主題色彩 ('slate' | 'indigo' | 'forest' | 'terracotta' | 'amber')
8. extractionNotes: 一句簡潔友善的辨識完成說明
`;
        const parts: any[] = [{ text: promptInstruction }];
        if (isPdf && pureBase64) {
          parts.push({
            inlineData: { mimeType: "application/pdf", data: pureBase64 },
          });
        } else if (isImage && pureBase64) {
          parts.push({
            inlineData: { mimeType: detectedMime || "image/jpeg", data: pureBase64 },
          });
        } else if (extractedText) {
          parts.push({
            text: `【檔案文字內容】：\n"""\n${extractedText.slice(0, 15000)}\n"""`,
          });
        }

        // Try gemini-3.6-flash, fallback to gemini-3.8-flash
        const modelsToTry = ["gemini-3.6-flash", "gemini-3.8-flash"];
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
