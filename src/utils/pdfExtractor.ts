import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Configure worker and CMap paths safely
try {
  if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
    try {
      const v = pdfjsLib.version || "4.10.38";
      // Blob URL trampoline for Web Worker to bypass cross-origin worker restrictions in sandboxed iframes
      const workerUrl = `https://unpkg.com/pdfjs-dist@${v}/legacy/build/pdf.worker.min.mjs`;
      const blob = new Blob([`importScripts("${workerUrl}");`], { type: "application/javascript" });
      pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
    } catch {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || "4.10.38"}/legacy/build/pdf.worker.min.mjs`;
    }
  }
} catch (e) {
  console.warn("PDF worker configuration notice:", e);
}

/**
 * Extract text from a PDF ArrayBuffer directly in the browser or Node.
 * Iterates through all pages, extracts text items, preserves line breaks and structure.
 * Supports CJK / Traditional Chinese characters using CMap tables.
 */
export async function extractTextFromPdfArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const v = pdfjsLib.version || "4.10.38";
    
    const loadingTask = pdfjsLib.getDocument({
      data: uint8,
      useSystemFonts: true,
      disableFontFace: true,
      cMapUrl: `https://unpkg.com/pdfjs-dist@${v}/cmaps/`,
      cMapPacked: true,
      standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${v}/standard_fonts/`,
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
          // Check if there is a vertical line shift
          const currentY = item.transform ? item.transform[5] : null;
          if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 6) {
            pageStr += "\n";
          } else if (pageStr.length > 0 && !pageStr.endsWith("\n") && !pageStr.endsWith(" ")) {
            pageStr += " ";
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
    if (fullText.trim().length > 0) {
      return fullText.trim();
    }
  } catch (pdfErr) {
    console.warn("pdfjs-dist extraction failed, trying stream scanner fallback:", pdfErr);
  }

  // Fallback: Stream scanner for uncompressed or FlateDecode text in raw bytes
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const raw = decoder.decode(uint8);

    // Look for BT ... ET text blocks
    const btRegex = /BT[\s\S]*?ET/g;
    const matches = raw.match(btRegex);
    if (matches && matches.length > 0) {
      const extracted: string[] = [];
      for (const block of matches) {
        // Match string literals (text) Tj or ' or "
        const strRegex = /\(([^)]+)\)\s*T[jJ]/g;
        let sm;
        while ((sm = strRegex.exec(block)) !== null) {
          extracted.push(sm[1]);
        }
      }
      if (extracted.join("").length > 20) {
        return extracted.join("\n");
      }
    }
  } catch (fallbackErr) {
    console.warn("Raw PDF stream scan warning:", fallbackErr);
  }

  return "";
}
