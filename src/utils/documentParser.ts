import { ColorTheme, LayoutStyle } from "../types";
import { 
  extractTextFromDocxArrayBuffer, 
  extractPlanFromDocumentText,
  ExtractedPlanData 
} from "./planExtractor";

export type { ExtractedPlanData };

/**
 * Extract raw text from file directly in browser or server.
 * Handles .docx, .doc, .txt, .md, .csv, .json seamlessly.
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
    try {
      return await file.text();
    } catch (e) {
      console.warn("Text file read warning:", e);
    }
  }

  // 2. Word .docx file (Pure JSZip + OOXML extraction, works 100% in browser and Node)
  if (lowerName.endsWith(".docx") || file.type.includes("wordprocessingml")) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const extracted = await extractTextFromDocxArrayBuffer(arrayBuffer);
      if (extracted && extracted.trim().length > 0) {
        return extracted.trim();
      }
    } catch (docxErr) {
      console.warn("Docx parsing warning:", docxErr);
    }
  }

  // 3. Fallback: try reading as arrayBuffer text or file.text()
  try {
    const raw = await file.text();
    // Check if it's text-like (contains Chinese or ASCII without null bytes)
    if (raw && !raw.includes("\u0000")) {
      return raw.trim();
    }
  } catch (err) {
    console.warn("Raw text fallback warning:", err);
  }

  return "";
}

/**
 * Intelligent rule extractor to parse event details from raw document text
 */
export function extractPlanFromText(rawText: string, fileName?: string): ExtractedPlanData {
  return extractPlanFromDocumentText(rawText, fileName);
}
