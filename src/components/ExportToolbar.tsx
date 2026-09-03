import React, { useState } from "react";
import { 
  LayoutStyle, 
  ColorTheme, 
  PageFormat 
} from "../types";
import { 
  FileDown, 
  Image as ImageIcon, 
  Printer, 
  Edit3, 
  Check, 
  Sparkles, 
  Layout, 
  Palette, 
  Maximize2,
  RefreshCw
} from "lucide-react";
import { downloadAsPdf, downloadAsImage } from "../utils/exportUtils";

interface ExportToolbarProps {
  currentLayout: LayoutStyle;
  onLayoutChange: (layout: LayoutStyle) => void;
  currentTheme: ColorTheme;
  onThemeChange: (theme: ColorTheme) => void;
  currentFormat: PageFormat;
  onFormatChange: (format: PageFormat) => void;
  isEditable: boolean;
  onToggleEditable: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  eventTitle: string;
}

export const ExportToolbar: React.FC<ExportToolbarProps> = ({
  currentLayout,
  onLayoutChange,
  currentTheme,
  onThemeChange,
  currentFormat,
  onFormatChange,
  isEditable,
  onToggleEditable,
  onRegenerate,
  isRegenerating,
  eventTitle,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const getCanvasElement = (): HTMLElement | null => {
    return document.getElementById("printable-digest-canvas");
  };

  const handleDownloadPdf = async () => {
    const el = getCanvasElement();
    if (!el) return;
    setIsExportingPdf(true);
    setExportNotice("正在渲染向量與高畫質 PDF...");
    try {
      await downloadAsPdf(el, {
        fileName: `${eventTitle || "活動成果紀實"}_成果報告`,
        scale: 2,
      });
      setExportNotice("✅ PDF 報告書已成功下載！");
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error(err);
      setExportNotice("❌ 匯出 PDF 發生錯誤，請稍候重試");
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    const el = getCanvasElement();
    if (!el) return;
    setIsExportingImage(true);
    setExportNotice("正在輸出超高解析度相片檔 (PNG)...");
    try {
      await downloadAsImage(el, {
        fileName: `${eventTitle || "活動成果紀實"}_排版圖`,
        scale: 2,
      });
      setExportNotice("✅ 高畫質相片檔已成功下載！");
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      console.error(err);
      setExportNotice("❌ 輸出相片檔發生錯誤，請稍候重試");
      setTimeout(() => setExportNotice(null), 4000);
    } finally {
      setIsExportingImage(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="export-toolbar-section" className="bg-white rounded-2xl border border-stone-200 p-4 shadow-sm space-y-4">
      {/* Top Bar: Title & Download Action Buttons */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-stone-900">
              排版成果已就緒・隨時下載分享
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            支援輸出列印專用 PDF、高畫質相片檔 (PNG) 或直接列印
          </p>
        </div>

        {/* Download Buttons Group */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Download PDF Button */}
          <button
            type="button"
            disabled={isExportingPdf || isExportingImage}
            onClick={handleDownloadPdf}
            className="flex-1 md:flex-none px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isExportingPdf ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <FileDown className="w-3.5 h-3.5" />
                <span>下載 PDF 成果報告</span>
              </>
            )}
          </button>

          {/* Download Image Button */}
          <button
            type="button"
            disabled={isExportingPdf || isExportingImage}
            onClick={handleDownloadImage}
            className="flex-1 md:flex-none px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
          >
            {isExportingImage ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>轉檔中...</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5" />
                <span>下載相片檔 (PNG)</span>
              </>
            )}
          </button>

          {/* Print Button */}
          <button
            type="button"
            onClick={handlePrint}
            title="列印排版"
            className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer border border-stone-200"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">列印</span>
          </button>
        </div>
      </div>

      {/* Export status toast notice */}
      {exportNotice && (
        <div className="bg-amber-50 text-amber-900 border border-amber-200 rounded-lg p-2.5 text-xs text-center font-medium animate-fadeIn">
          {exportNotice}
        </div>
      )}

      {/* Bottom Controls: Layout switch, Theme switch, Format switch, Edit toggle */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        {/* 1. Layout Style Switch */}
        <div className="space-y-1">
          <label className="text-stone-500 font-medium flex items-center gap-1">
            <Layout className="w-3 h-3 text-stone-400" />
            版面風格
          </label>
          <div className="grid grid-cols-4 gap-1 bg-stone-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onLayoutChange("magazine")}
              className={`py-1 text-center rounded font-medium transition-colors cursor-pointer ${
                currentLayout === "magazine"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              雜誌風
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange("executive")}
              className={`py-1 text-center rounded font-medium transition-colors cursor-pointer ${
                currentLayout === "executive"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              公務報
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange("gallery")}
              className={`py-1 text-center rounded font-medium transition-colors cursor-pointer ${
                currentLayout === "gallery"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              畫冊牆
            </button>
            <button
              type="button"
              onClick={() => onLayoutChange("chronicle")}
              className={`py-1 text-center rounded font-medium transition-colors cursor-pointer ${
                currentLayout === "chronicle"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              時序線
            </button>
          </div>
        </div>

        {/* 2. Format / Ratio Switch */}
        <div className="space-y-1">
          <label className="text-stone-500 font-medium flex items-center gap-1">
            <Maximize2 className="w-3 h-3 text-stone-400" />
            輸出畫布比例
          </label>
          <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => onFormatChange("a4-portrait")}
              className={`py-1 text-center rounded font-medium transition-colors cursor-pointer ${
                currentFormat === "a4-portrait"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              A4 直式
            </button>
            <button
              type="button"
              onClick={() => onFormatChange("landscape-slide")}
              className={`py-1 text-center rounded font-medium transition-colors cursor-pointer ${
                currentFormat === "landscape-slide"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              16:9 簡報
            </button>
            <button
              type="button"
              onClick={() => onFormatChange("square-post")}
              className={`py-1 text-center rounded font-medium transition-colors cursor-pointer ${
                currentFormat === "square-post"
                  ? "bg-white text-stone-900 shadow-2xs font-semibold"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              正方形
            </button>
          </div>
        </div>

        {/* 3. Color Theme Switch */}
        <div className="space-y-1">
          <label className="text-stone-500 font-medium flex items-center gap-1">
            <Palette className="w-3 h-3 text-stone-400" />
            主題色彩
          </label>
          <div className="flex items-center justify-between gap-1 bg-stone-100 p-1 rounded-lg">
            {(["slate", "indigo", "forest", "terracotta", "amber"] as ColorTheme[]).map((t) => {
              const colors: Record<ColorTheme, string> = {
                slate: "bg-slate-800",
                indigo: "bg-indigo-700",
                forest: "bg-emerald-800",
                terracotta: "bg-amber-900",
                amber: "bg-amber-600",
              };
              const isSelected = currentTheme === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onThemeChange(t)}
                  title={t}
                  className={`flex-1 h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                    isSelected ? "bg-white shadow-2xs ring-1 ring-stone-400" : "hover:bg-white/60"
                  }`}
                >
                  <span className={`w-3 h-3 rounded-full ${colors[t]}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Edit mode & Regenerate */}
        <div className="space-y-1">
          <label className="text-stone-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-stone-400" />
            微調與重整
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleEditable}
              className={`flex-1 py-1 px-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                isEditable
                  ? "bg-amber-100 border-amber-300 text-amber-900"
                  : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
              }`}
            >
              {isEditable ? (
                <>
                  <Check className="w-3 h-3 text-amber-700" />
                  <span>完成編輯</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-3 h-3 text-stone-500" />
                  <span>編輯文字</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isRegenerating}
              onClick={onRegenerate}
              title="重新呼叫 AI 潤飾文案摘要"
              className="py-1 px-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRegenerating ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">重整摘要</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
