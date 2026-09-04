import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import pako from "pako";

// Helper to determine if running in browser
const isBrowser = typeof window !== "undefined";

// Configure worker safely
try {
  if (isBrowser && pdfjsLib.GlobalWorkerOptions) {
    // Check if hosted locally in /pdfjs/pdf.worker.min.mjs (works in Vite dev/prod and Vercel)
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  }
} catch (e) {
  console.warn("PDF worker configuration notice:", e);
}

// Get local or remote CMap path
function getCMapUrl(): string {
  if (isBrowser) {
    return "/pdfjs/cmaps/";
  }
  // In Node.js / Vercel Serverless Function, use absolute filesystem path if available
  try {
    const cwd = (globalThis as any).process?.cwd ? (globalThis as any).process.cwd() : ".";
    return `${cwd}/public/pdfjs/cmaps/`;
  } catch {
    return "https://unpkg.com/pdfjs-dist@6.3.289/cmaps/";
  }
}

function getStandardFontUrl(): string {
  if (isBrowser) {
    return "/pdfjs/standard_fonts/";
  }
  try {
    const cwd = (globalThis as any).process?.cwd ? (globalThis as any).process.cwd() : ".";
    return `${cwd}/public/pdfjs/standard_fonts/`;
  } catch {
    return "https://unpkg.com/pdfjs-dist@6.3.289/standard_fonts/";
  }
}

/**
 * Check if space should be added between two characters.
 * CJK characters should NOT have spaces added between them.
 */
function shouldAddSpace(prevStr: string, nextStr: string): boolean {
  if (!prevStr || !nextStr) return false;
  const lastChar = prevStr.slice(-1);
  const firstChar = nextStr.charAt(0);
  const isCjk = /[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf\uff00-\uffef]/;
  if (isCjk.test(lastChar) || isCjk.test(firstChar)) return false;
  if (/[a-zA-Z0-9]/.test(lastChar) && /[a-zA-Z0-9]/.test(firstChar)) return true;
  return false;
}

/**
 * Decodes hex string from PDF format, e.g. <003100310035> or <4E2D6587>
 */
function decodeHexPdfString(hex: string): string {
  const cleanHex = hex.replace(/\s+/g, "");
  if (cleanHex.length >= 4 && cleanHex.length % 4 === 0) {
    let str = "";
    for (let i = 0; i < cleanHex.length; i += 4) {
      const code = parseInt(cleanHex.slice(i, i + 4), 16);
      if (!isNaN(code) && code > 0) {
        str += String.fromCharCode(code);
      }
    }
    if (str.length > 0) return str;
  }
  let str8 = "";
  for (let i = 0; i < cleanHex.length; i += 2) {
    const code = parseInt(cleanHex.slice(i, i + 2), 16);
    if (!isNaN(code) && code >= 32 && code < 127) {
      str8 += String.fromCharCode(code);
    }
  }
  return str8;
}

/**
 * Fallback raw stream parser using pako decompressor.
 * Scans all compressed streams in the PDF buffer, inflates them, and extracts text operators.
 */
function extractRawTextFromPdfBuffer(uint8: Uint8Array): string {
  try {
    const extractedLines: string[] = [];
    let pos = 0;
    const streamToken = [115, 116, 114, 101, 97, 109]; // 'stream'
    const endStreamToken = [101, 110, 100, 115, 116, 114, 101, 97, 109]; // 'endstream'

    function findSequence(data: Uint8Array, token: number[], startIndex: number): number {
      const len = data.length;
      const tLen = token.length;
      for (let i = startIndex; i <= len - tLen; i++) {
        let match = true;
        for (let j = 0; j < tLen; j++) {
          if (data[i + j] !== token[j]) {
            match = false;
            break;
          }
        }
        if (match) return i;
      }
      return -1;
    }

    while ((pos = findSequence(uint8, streamToken, pos)) !== -1) {
      let start = pos + 6;
      if (uint8[start] === 13) start++; // \r
      if (uint8[start] === 10) start++; // \n
      const end = findSequence(uint8, endStreamToken, start);
      if (end === -1) break;

      let endReal = end;
      if (uint8[endReal - 1] === 10) endReal--;
      if (uint8[endReal - 1] === 13) endReal--;

      const chunk = uint8.subarray(start, endReal);
      let decompressed: Uint8Array | null = null;
      try {
        decompressed = pako.inflate(chunk);
      } catch {
        try {
          decompressed = pako.inflateRaw(chunk);
        } catch {
          decompressed = chunk;
        }
      }

      if (decompressed && decompressed.length > 0) {
        const textDecoder = new TextDecoder("latin1", { fatal: false });
        const streamStr = textDecoder.decode(decompressed);

        // 1. Match (text) Tj or ' or "
        const tjRegex = /\(([^)]+)\)\s*(?:Tj|'|\")/g;
        let m: RegExpExecArray | null;
        while ((m = tjRegex.exec(streamStr)) !== null) {
          const val = m[1].replace(/\\([\\()])/g, "$1").trim();
          if (val) extractedLines.push(val);
        }

        // 2. Match [(text) -20 (more)] TJ
        const tjArrayRegex = /\[(.*?)\]\s*TJ/gs;
        while ((m = tjArrayRegex.exec(streamStr)) !== null) {
          const inner = m[1];
          const innerLitRegex = /\(([^)]+)\)/g;
          let im: RegExpExecArray | null;
          let combined = "";
          while ((im = innerLitRegex.exec(inner)) !== null) {
            combined += im[1].replace(/\\([\\()])/g, "$1");
          }
          if (combined.trim()) extractedLines.push(combined.trim());

          // Also check for hex inside TJ: [<0031> 10 <0032>] TJ
          const innerHexRegex = /<([0-9a-fA-F]+)>/g;
          let hm: RegExpExecArray | null;
          let combinedHex = "";
          while ((hm = innerHexRegex.exec(inner)) !== null) {
            combinedHex += decodeHexPdfString(hm[1]);
          }
          if (combinedHex.trim()) extractedLines.push(combinedHex.trim());
        }

        // 3. Match <hex> Tj
        const hexTjRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|\")/g;
        while ((m = hexTjRegex.exec(streamStr)) !== null) {
          const decoded = decodeHexPdfString(m[1]).trim();
          if (decoded) extractedLines.push(decoded);
        }
      }
      pos = end + 9;
    }

    if (extractedLines.length > 0) {
      return extractedLines.join("\n");
    }
  } catch (err) {
    console.warn("Raw PDF stream parser notice:", err);
  }
  return "";
}

/**
 * Extract text from a PDF ArrayBuffer directly in the browser or Node.
 * Iterates through all pages, extracts text items, preserves line breaks and structure.
 * Supports CJK / Traditional Chinese characters using CMap tables.
 */
export async function extractTextFromPdfArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  const uint8 = new Uint8Array(arrayBuffer);

  // Method 1: Use pdfjs-dist
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
      disableFontFace: true,
      cMapUrl: getCMapUrl(),
      cMapPacked: true,
      standardFontDataUrl: getStandardFontUrl(),
      verbosity: 0,
    } as any);

    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        let lastY: number | null = null;
        let pageStr = "";

        for (const item of textContent.items as any[]) {
          if (!item.str) continue;
          const currentY = item.transform ? item.transform[5] : null;

          // Check if there is a vertical line shift
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 5) {
            pageStr += "\n";
          } else if (pageStr.length > 0 && !pageStr.endsWith("\n")) {
            if (shouldAddSpace(pageStr, item.str)) {
              pageStr += " ";
            }
          }
          pageStr += item.str;
          lastY = currentY;
        }

        if (pageStr.trim()) {
          pageTexts.push(pageStr.trim());
        }
      } catch (pageErr) {
        console.warn(`Error extracting text from page ${pageNum}:`, pageErr);
      }
    }

    const fullText = pageTexts.join("\n\n");
    if (fullText.trim().length > 15) {
      return fullText.trim();
    }
  } catch (pdfErr) {
    console.warn("pdfjs-dist extraction failed, trying stream decompressor fallback:", pdfErr);
  }

  // Method 2: Fallback stream decompressor with Pako & UTF-16 hex decoder
  const fallbackText = extractRawTextFromPdfBuffer(uint8);
  if (fallbackText && fallbackText.trim().length > 15) {
    return fallbackText.trim();
  }

  return "";
}
