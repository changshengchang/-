import { toPng, toJpeg } from "html-to-image";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export interface ExportOptions {
  fileName?: string;
  quality?: number;
  scale?: number;
}

interface ImageBackup {
  img: HTMLImageElement;
  originalSrc: string;
}

/**
 * Convert a blob to Base64 data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string) || "");
    reader.onerror = () => resolve("");
    reader.readAsDataURL(blob);
  });
}

/**
 * SVG fallback placeholder in case an external image fails completely
 */
function createSvgPlaceholder(width = 800, height = 600): string {
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-family="sans-serif" font-size="22">活動影像紀錄</text></svg>`
    )
  );
}

/**
 * Cleanly convert any remote image URL to a local Base64 data URL
 */
export async function convertRemoteImageToDataUrl(url: string): Promise<string> {
  if (!url) return "";
  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }

  // 1. Try direct fetch
  try {
    const resp = await fetch(url, { mode: "cors", cache: "force-cache" });
    if (resp.ok) {
      const blob = await resp.blob();
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl) return dataUrl;
    }
  } catch {
    // Direct fetch might be blocked by CORS
  }

  // 2. Try proxy endpoint
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxyUrl);
    if (resp.ok) {
      const blob = await resp.blob();
      const dataUrl = await blobToDataUrl(blob);
      if (dataUrl) return dataUrl;
    }
  } catch (err) {
    console.warn("Proxy image fetch failed:", url, err);
  }

  // 3. Fallback placeholder
  return createSvgPlaceholder();
}

/**
 * Pre-convert all images in an element to base64 Data URLs so canvas is never tainted
 */
async function inlineAllImages(element: HTMLElement): Promise<ImageBackup[]> {
  const images = Array.from(element.querySelectorAll("img"));
  const backups: ImageBackup[] = [];

  await Promise.all(
    images.map(async (img) => {
      const originalSrc = img.src;
      img.crossOrigin = "anonymous";

      if (originalSrc && originalSrc.startsWith("http")) {
        backups.push({ img, originalSrc });
        const cleanDataUrl = await convertRemoteImageToDataUrl(originalSrc);
        if (cleanDataUrl) {
          img.src = cleanDataUrl;
        }
      }
    })
  );

  // Short pause to ensure DOM updates inlined images
  if (backups.length > 0) {
    await new Promise((resolve) => setTimeout(resolve, 80));
  }

  return backups;
}

/**
 * Restore original src attributes after export completes
 */
function restoreImages(backups: ImageBackup[]) {
  for (const item of backups) {
    item.img.src = item.originalSrc;
  }
}

/**
 * Capture element as high-resolution Data URL with automatic engine fallback
 */
async function captureElementAsDataUrl(
  element: HTMLElement,
  format: "png" | "jpeg" = "png",
  quality = 0.95
): Promise<{ dataUrl: string; width: number; height: number }> {
  // Inline any external images
  const backups = await inlineAllImages(element);

  try {
    // Strategy 1: html-to-image (modern browser native SVG foreignObject, fully supports Tailwind 4 oklch)
    try {
      const options = {
        quality,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
      };

      const dataUrl =
        format === "png"
          ? await toPng(element, options)
          : await toJpeg(element, options);

      const width = element.offsetWidth * 2 || 1600;
      const height = element.offsetHeight * 2 || 2200;
      return { dataUrl, width, height };
    } catch (htiErr) {
      console.warn("Primary export engine (html-to-image) encountered an error, falling back to html2canvas-pro:", htiErr);
    }

    // Strategy 2: html2canvas-pro (enhanced html2canvas with oklch & color() support)
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false, // Never taint canvas so toDataURL never throws SecurityError
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: 0,
    });

    const dataUrl = canvas.toDataURL(format === "png" ? "image/png" : "image/jpeg", quality);
    return { dataUrl, width: canvas.width, height: canvas.height };
  } finally {
    restoreImages(backups);
  }
}

/**
 * Download an HTML element as high-res PNG image
 */
export async function downloadAsImage(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<boolean> {
  try {
    const { dataUrl } = await captureElementAsDataUrl(element, "png", options.quality || 0.95);

    const downloadLink = document.createElement("a");
    const name = options.fileName || "活動成果排版紀實";
    downloadLink.download = `${sanitizeFileName(name)}_${formatDate()}.png`;
    downloadLink.href = dataUrl;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    return true;
  } catch (err) {
    console.error("Failed to export image:", err);
    throw err;
  }
}

/**
 * Download an HTML element as PDF
 */
export async function downloadAsPdf(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<boolean> {
  try {
    const { dataUrl, width: canvasWidth, height: canvasHeight } = await captureElementAsDataUrl(
      element,
      "jpeg",
      0.95
    );

    // Determine orientation based on aspect ratio
    const isLandscape = canvasWidth > canvasHeight;
    const pdf = new jsPDF({
      orientation: isLandscape ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate scaling to fit page while maintaining aspect ratio
    const imgRatio = canvasWidth / canvasHeight;
    let finalWidth = pdfWidth;
    let finalHeight = pdfWidth / imgRatio;

    // If image height exceeds page, scale down to fit
    if (finalHeight > pdfHeight) {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight * imgRatio;
    }

    // Center image on the page
    const posX = (pdfWidth - finalWidth) / 2;
    const posY = (pdfHeight - finalHeight) / 2;

    pdf.addImage(dataUrl, "JPEG", posX, posY, finalWidth, finalHeight);

    const name = options.fileName || "活動成果成果報告";
    pdf.save(`${sanitizeFileName(name)}_${formatDate()}.pdf`);
    return true;
  } catch (err) {
    console.error("Failed to export PDF:", err);
    throw err;
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "_").trim() || "活動成果紀實";
}

function formatDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}
