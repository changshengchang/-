import * as mammoth from "mammoth";
import { ColorTheme, LayoutStyle } from "../types";

export interface ExtractedPlanData {
  title: string;
  date: string;
  location: string;
  organizer: string;
  planContent: string;
  preferredStyle: LayoutStyle;
  preferredTheme: ColorTheme;
  extractionNotes?: string;
}

/**
 * Extract raw text from file directly in browser or server
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();

  // 1. Plain text, markdown, CSV, JSON
  if (
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".csv") ||
    lowerName.endsWith(".json") ||
    file.type.startsWith("text/")
  ) {
    return await file.text();
  }

  // 2. Word .docx file
  if (lowerName.endsWith(".docx")) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      // mammoth browser support
      const result = await (mammoth as any).extractRawText({ arrayBuffer });
      if (result && result.value && result.value.trim().length > 0) {
        return result.value.trim();
      }
    } catch (err) {
      console.warn("Mammoth browser extraction warning:", err);
    }
  }

  // Fallback: try file.text()
  try {
    const raw = await file.text();
    // check if it's text-like
    if (raw && !raw.includes("\u0000")) {
      return raw;
    }
  } catch (err) {
    console.warn("Raw text fallback warning:", err);
  }

  return "";
}

/**
 * Intelligent client-side rule extractor to parse event details from raw document text
 */
export function extractPlanFromText(rawText: string, fileName?: string): ExtractedPlanData {
  const clean = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);

  // Defaults
  let title = "";
  let date = "";
  let location = "";
  let organizer = "";
  let preferredStyle: LayoutStyle = "magazine";
  let preferredTheme: ColorTheme = "slate";

  // 1. Title detection
  for (const line of lines.slice(0, 10)) {
    // Check for title markers: 【...】, 《...》, 活動主題：..., 活動名稱：...
    const titleMatch = line.match(/(?:活動名稱|活動主題|專案名稱|企劃主題|企劃名稱|計畫名稱)[：:\s]+([^\n\r]+)/i);
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].replace(/[【】《》「」『』]/g, "").trim();
      break;
    }
    const bracketMatch = line.match(/^[【《「『](.+?)[】》」』]$/);
    if (bracketMatch && bracketMatch[1].trim().length >= 4 && bracketMatch[1].trim().length <= 40) {
      title = bracketMatch[1].trim();
      break;
    }
  }

  if (!title) {
    // Try filename without extension
    if (fileName) {
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "").replace(/[【】《》_]/g, " ").trim();
      if (nameWithoutExt.length >= 3) {
        title = nameWithoutExt;
      }
    }
  }
  if (!title && lines.length > 0) {
    title = lines[0].slice(0, 30);
  }

  // 2. Date detection
  for (const line of lines) {
    const dateMatch = line.match(/(?:活動日期|舉辦日期|活動期程|活動時間|日期|期程)[：:\s]+([^\n\r]+)/i);
    if (dateMatch && dateMatch[1].trim()) {
      date = dateMatch[1].trim();
      break;
    }
    const rawDateMatch = line.match(/(\d{4}[年\/\-\.]\d{1,2}[月\/\-\.]\d{1,2}[日號]?(?:\s*(?:至|~|-|～)\s*\d{1,2}[月\/\-\.]\d{1,2}[日號]?)?)/);
    if (rawDateMatch && !date) {
      date = rawDateMatch[1].trim();
    }
  }
  if (!date) {
    const now = new Date();
    date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  }

  // 3. Location detection
  for (const line of lines) {
    const locMatch = line.match(/(?:活動地點|舉辦地點|活動場地|場地地點|地點|場地)[：:\s]+([^\n\r]+)/i);
    if (locMatch && locMatch[1].trim()) {
      location = locMatch[1].trim();
      break;
    }
  }
  if (!location) {
    location = "活動指定現場";
  }

  // 4. Organizer detection
  for (const line of lines) {
    const orgMatch = line.match(/(?:主辦單位|指導單位|主辦機構|執行單位|籌辦單位|主辦團隊)[：:\s]+([^\n\r]+)/i);
    if (orgMatch && orgMatch[1].trim()) {
      organizer = orgMatch[1].trim();
      break;
    }
  }
  if (!organizer) {
    organizer = "活動籌備團隊";
  }

  // 5. Plan content
  let planContent = clean;
  if (planContent.length > 1500) {
    planContent = planContent.slice(0, 1500) + "...";
  }

  // 6. Style & Theme recommendation
  if (clean.includes("展覽") || clean.includes("攝影") || clean.includes("藝術") || clean.includes("美學")) {
    preferredStyle = "gallery";
    preferredTheme = "terracotta";
  } else if (clean.includes("工作坊") || clean.includes("黑客松") || clean.includes("青年") || clean.includes("競賽")) {
    preferredStyle = "magazine";
    preferredTheme = "indigo";
  } else if (clean.includes("會議") || clean.includes("成果展") || clean.includes("發表會") || clean.includes("政務")) {
    preferredStyle = "executive";
    preferredTheme = "slate";
  } else if (clean.includes("營隊") || clean.includes("歷史") || clean.includes("走讀") || clean.includes("自然")) {
    preferredStyle = "chronicle";
    preferredTheme = "forest";
  }

  return {
    title: title || "活動專案成果與紀實",
    date,
    location,
    organizer,
    planContent,
    preferredStyle,
    preferredTheme,
    extractionNotes: `已成功解析文件「${fileName || "活動企劃"}」，並自動擷取核心活動資訊！`,
  };
}
