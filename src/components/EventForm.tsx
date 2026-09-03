import React, { useState, useRef } from "react";
import { EventPlanInput, LayoutStyle, ColorTheme } from "../types";
import { 
  Sparkles, 
  FileText, 
  Calendar, 
  MapPin, 
  Building2, 
  Palette, 
  Layout, 
  Compass, 
  RefreshCw,
  UploadCloud,
  FileUp,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck2,
  Zap,
  BarChart3,
  Plus,
  Trash2
} from "lucide-react";
import { SAMPLE_PRESETS } from "../data/samplePresets";
import { extractTextFromFile, extractPlanFromText } from "../utils/documentParser";

interface EventFormProps {
  plan: EventPlanInput;
  onChange: (plan: EventPlanInput) => void;
  onSubmit: () => void;
  isLoading: boolean;
  onSelectPreset: (presetId: string) => void;
  photoCount: number;
}

const LAYOUT_STYLES: { id: LayoutStyle; label: string; desc: string; icon: any }[] = [
  {
    id: "magazine",
    label: "雜誌專題風",
    desc: "大器主視覺、引言金句、圖文交錯排版",
    icon: Layout,
  },
  {
    id: "executive",
    label: "公務成果報告",
    desc: "正式公務/企業規格、成效指標數據、結構化摘要",
    icon: FileText,
  },
  {
    id: "gallery",
    label: "現代畫冊拼貼",
    desc: "多格相片牆、焦點圖說、簡潔留白美學",
    icon: Compass,
  },
  {
    id: "chronicle",
    label: "時序故事紀實",
    desc: "進程時軸、動態脈絡、活動里程碑",
    icon: Calendar,
  },
];

const THEME_OPTIONS: { id: ColorTheme; label: string; bgClass: string; textClass: string }[] = [
  { id: "slate", label: "石墨灰藍", bgClass: "bg-slate-800", textClass: "text-slate-800" },
  { id: "indigo", label: "前瞻科技藍", bgClass: "bg-indigo-700", textClass: "text-indigo-700" },
  { id: "forest", label: "自然深林", bgClass: "bg-emerald-800", textClass: "text-emerald-800" },
  { id: "terracotta", label: "溫潤陶瓦", bgClass: "bg-amber-900", textClass: "text-amber-900" },
  { id: "amber", label: "秋陽琥珀", bgClass: "bg-amber-600", textClass: "text-amber-600" },
];

const SUGGESTED_METRICS = [
  { label: "參與者滿意度", value: "98.5%" },
  { label: "活動參與人次", value: "350+ 人" },
  { label: "產出專案成果", value: "12 組" },
  { label: "極限攻堅時數", value: "36 h" },
  { label: "跨領域合作夥伴", value: "8 家" },
  { label: "全程出席完訓率", value: "100%" },
  { label: "媒體報導與曝光", value: "15 則" },
  { label: "永續減碳效益", value: "250 kg" },
];

export const EventForm: React.FC<EventFormProps> = ({
  plan,
  onChange,
  onSubmit,
  isLoading,
  onSelectPreset,
  photoCount,
}) => {
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractSuccessNotice, setExtractSuccessNotice] = useState<string | null>(null);
  const [extractErrorNotice, setExtractErrorNotice] = useState<string | null>(null);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateField = (key: keyof EventPlanInput, value: any) => {
    onChange({
      ...plan,
      [key]: value,
    });
  };

  const currentMetrics = plan.keyMetrics || [
    { label: "參與者滿意度", value: "98.5%" },
    { label: "產出原型專案", value: "12 組" },
    { label: "落地專利雛型", value: "4 項" },
    { label: "極限攻堅時數", value: "36 h" },
  ];

  const handleMetricChange = (index: number, field: "label" | "value", val: string) => {
    const nextMetrics = [...currentMetrics];
    if (nextMetrics[index]) {
      nextMetrics[index] = { ...nextMetrics[index], [field]: val };
      updateField("keyMetrics", nextMetrics);
    }
  };

  const handleAddMetric = () => {
    const nextMetrics = [...currentMetrics, { label: "新成果指標", value: "100%" }];
    updateField("keyMetrics", nextMetrics);
  };

  const handleRemoveMetric = (index: number) => {
    const nextMetrics = currentMetrics.filter((_, i) => i !== index);
    updateField("keyMetrics", nextMetrics);
  };

  const handleApplySuggestedMetric = (sug: { label: string; value: string }) => {
    const nextMetrics = [...currentMetrics, sug];
    updateField("keyMetrics", nextMetrics);
  };

  // Process file upload and trigger AI auto-extraction with robust client fallback
  const handleProcessFile = async (file: File) => {
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setExtractErrorNotice("檔案大小超過 25MB 上限，請選擇較小的企劃檔案");
      setTimeout(() => setExtractErrorNotice(null), 5000);
      return;
    }

    setIsExtracting(true);
    setExtractErrorNotice(null);
    setExtractSuccessNotice(null);

    try {
      // 1. Attempt client-side text extraction first (works natively in browser for docx, txt, md)
      let localText = "";
      try {
        localText = await extractTextFromFile(file);
      } catch (clientParseErr) {
        console.warn("Client text extraction notice:", clientParseErr);
      }

      // Convert file to Base64 (needed for PDF/images or server-side analysis)
      let base64Data = "";
      try {
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || "");
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });
      } catch (b64Err) {
        console.warn("Base64 conversion failed:", b64Err);
      }

      // Pre-extract locally using our high-precision client engine
      let clientExtracted: any = null;
      if (localText && localText.trim().length > 0) {
        try {
          clientExtracted = extractPlanFromText(localText, file.name);
        } catch (localParseErr) {
          console.warn("Client rule extraction warning:", localParseErr);
        }
      }

      let extractedResult: any = null;

      // 2. Attempt server-side AI extraction if endpoint is available
      try {
        const response = await fetch("/api/extract-plan-from-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileBase64: base64Data.length < 5000000 ? base64Data : "",
            extractedText: localText,
          }),
        });

        // Safe JSON parsing check to prevent "Unexpected token 'T'" errors if server returns 404 HTML
        const contentType = response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("application/json")) {
          const resJson = await response.json();
          if (resJson && resJson.success && resJson.data) {
            extractedResult = resJson.data;
          }
        }
      } catch (apiErr) {
        console.warn("Server API extraction unavailable, fallback to client parser:", apiErr);
      }

      // Merge server and client extractions intelligently:
      // If server returned generic fallback placeholders, preserve client's specific detected values!
      const isGenericDate = (d?: string) => !d || d.includes("近期") || d.includes("規劃中");
      const isGenericLoc = (l?: string) => !l || l.includes("指定現場") || l.includes("待定");
      const isGenericOrg = (o?: string) => !o || o.includes("籌劃小組") || o.includes("籌備小組") || o.includes("籌辦委員會");

      let finalResult = extractedResult || clientExtracted;
      if (extractedResult && clientExtracted) {
        finalResult = {
          ...extractedResult,
          title: extractedResult.title || clientExtracted.title,
          date: isGenericDate(extractedResult.date) && !isGenericDate(clientExtracted.date) ? clientExtracted.date : (extractedResult.date || clientExtracted.date),
          location: isGenericLoc(extractedResult.location) && !isGenericLoc(clientExtracted.location) ? clientExtracted.location : (extractedResult.location || clientExtracted.location),
          organizer: isGenericOrg(extractedResult.organizer) && !isGenericOrg(clientExtracted.organizer) ? clientExtracted.organizer : (extractedResult.organizer || clientExtracted.organizer),
          planContent: (!extractedResult.planContent || extractedResult.planContent.length < 40) && clientExtracted.planContent ? clientExtracted.planContent : (extractedResult.planContent || clientExtracted.planContent),
          preferredStyle: extractedResult.preferredStyle || clientExtracted.preferredStyle,
          preferredTheme: extractedResult.preferredTheme || clientExtracted.preferredTheme,
        };
      }

      if (finalResult) {
        // Auto-populate extracted information
        onChange({
          ...plan,
          title: finalResult.title || plan.title,
          date: finalResult.date || plan.date,
          location: finalResult.location || plan.location,
          organizer: finalResult.organizer || plan.organizer,
          planContent: finalResult.planContent || plan.planContent,
          preferredStyle: (finalResult.preferredStyle as LayoutStyle) || plan.preferredStyle,
          preferredTheme: (finalResult.preferredTheme as ColorTheme) || plan.preferredTheme,
        });

        setUploadedDocName(file.name);
        setExtractSuccessNotice(
          finalResult.extractionNotes ||
            `已成功從「${file.name}」精確智慧萃取活動名稱、日期、地點、主辦單位及成果說明！`
        );
      } else {
        throw new Error(`無法從「${file.name}」解析出文字內容。若為特殊編碼，請直接於下方貼上企劃文字。`);
      }
    } catch (err: any) {
      console.error("Document extraction failed:", err);
      setExtractErrorNotice(err.message || "解析企劃文件發生錯誤，請確認檔案內容或重試");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
    // reset input so same file can be re-uploaded if desired
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Demo sample document extraction for users without a file on hand
  const handleLoadSampleDocument = () => {
    const sampleDocContent = `
【2026 國際青年永續設計工作坊暨黑客松企劃書】
主辦單位：全球永續設計聯盟 (GSDA) 與 國立設計創新研究中心
舉辦日期：2026年10月18日至10月20日（為期三天兩夜）
活動地點：松山文創園區 2號倉庫暨多元創客空間

【活動計畫宗旨與核心目標】
本次工作坊號召全台各大專院校與新創團隊青年，聚焦於循環經濟與低碳產品設計。
透過 48 小時極限共創，將廢棄材料轉化為具備商業潛力與環境友善的高價值實體產品。

【執行歷程與豐碩成果】
1. 前瞻講座：邀請 5 位國際永續大師進行關鍵概念演繹，激盪全場青年思維。
2. 實作驗證：16 組團隊在 48 小時內皆成功以 3D 列印與環保回收材產出運作模型。
3. 成果發表：總決賽現場吸引超過 350 位產官學貴賓蒞臨，並有 3 項獲獎設計正式與創投簽署合作意向書。
全體參與者滿意度達 99.2%，成功打造青年永續跨界設計的最佳典範！
`;
    // Create a virtual file to test the extraction flow
    const blob = new Blob([sampleDocContent], { type: "text/plain" });
    const virtualFile = new File([blob], "2026國際青年永續設計工作坊企劃書.txt", {
      type: "text/plain",
    });
    handleProcessFile(virtualFile);
  };

  const clearUploadedFile = () => {
    setUploadedDocName(null);
    setExtractSuccessNotice(null);
    setExtractErrorNotice(null);
  };

  return (
    <div id="event-form-section" className="space-y-6">
      {/* Step 2 Header & Presets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-stone-100 flex items-center justify-center font-medium text-sm">
              2
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                活動計畫內容與排版設定
              </h2>
              <p className="text-xs text-stone-500">
                可上傳企劃檔案由 AI 自動擷取，或直接填寫貼上活動內容
              </p>
            </div>
          </div>

          {/* Quick preset selector */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-stone-600 font-medium">快速套用範例：</span>
            {SAMPLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.id)}
                className="text-xs bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 px-2 py-1 rounded-md transition-colors cursor-pointer border border-stone-200"
              >
                {p.name.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Feature Highlight: Document Upload & Auto-Extraction Zone */}
      <div className="bg-gradient-to-r from-amber-50/70 via-stone-50 to-amber-50/40 rounded-2xl border border-amber-200/80 p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-1.5">
                以檔案上傳自動擷取活動資訊
                <span className="text-[10px] bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                  智慧萃取
                </span>
              </h3>
              <p className="text-xs text-stone-600">
                支援 PDF、Word (.docx)、純文字檔或企劃截圖，自動辨識名稱、日期、地點、主辦單位及成果
              </p>
            </div>
          </div>

          {/* Quick demo document loader */}
          <button
            type="button"
            disabled={isExtracting}
            onClick={handleLoadSampleDocument}
            className="text-xs bg-white hover:bg-amber-100/60 text-amber-900 border border-amber-300/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer font-medium flex items-center gap-1 shadow-2xs disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5 text-amber-700" />
            <span>試試載入範例企劃書檔</span>
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,.csv,.png,.jpg,.jpeg,.webp"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isExtracting}
        />

        {/* Drag & Drop Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            isDragOver
              ? "border-amber-600 bg-amber-100/50 scale-[1.01]"
              : isExtracting
              ? "border-amber-400 bg-amber-50/50 cursor-wait"
              : "border-stone-300 hover:border-amber-500 bg-white/80 hover:bg-white"
          }`}
        >
          {isExtracting ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-2">
              <RefreshCw className="w-6 h-6 text-amber-600 animate-spin" />
              <div className="text-xs sm:text-sm font-semibold text-stone-800">
                AI 正在解析企劃文件內容...
              </div>
              <p className="text-xs text-stone-500">
                正在自動提取：活動名稱、活動日期、活動地點、主辦單位、計畫內容及成果說明
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 py-1">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-center sm:text-left space-y-0.5">
                <div className="text-xs sm:text-sm font-semibold text-stone-800 flex items-center justify-center sm:justify-start gap-1">
                  <span>拖曳或點選上傳企劃檔案</span>
                  <span className="text-amber-700 underline text-xs font-bold">點此選取</span>
                </div>
                <div className="text-[11px] text-stone-500 flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                  <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">.PDF</span>
                  <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">.DOCX</span>
                  <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">.TXT</span>
                  <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">.PNG/.JPG</span>
                  <span>(單檔上限 25MB)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Success Notice Banner */}
        {extractSuccessNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3 text-xs flex items-start justify-between gap-2 animate-fadeIn">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">已自動擷取填入！</span>
                <span className="ml-1 text-emerald-800">{extractSuccessNotice}</span>
                <div className="text-[11px] text-emerald-700 mt-0.5">
                  所有欄位已自動填入下方表單，您可以自由檢視並依實際需要微調。
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={clearUploadedFile}
              title="清除提示"
              className="text-emerald-700 hover:text-emerald-900 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error Notice Banner */}
        {extractErrorNotice && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{extractErrorNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setExtractErrorNotice(null)}
              className="text-rose-700 hover:text-rose-900 cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Input Fields Grid */}
      <div className="bg-white rounded-xl border border-stone-200 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
            活動核心欄位明細 (可隨時手動微調)
          </span>
          {uploadedDocName && (
            <span className="text-[11px] text-stone-500 flex items-center gap-1 font-mono">
              <FileCheck2 className="w-3 h-3 text-emerald-600" />
              來源文件：{uploadedDocName}
            </span>
          )}
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            活動主題名稱 <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={plan.title}
            onChange={(e) => updateField("title", e.target.value)}
            placeholder="例如：2026 跨界數位創新黑客松成果發表會"
            className="w-full text-sm px-3.5 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none transition-all"
          />
        </div>

        {/* Date, Location, Organizer Trio */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-stone-700 mb-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              活動日期
            </label>
            <input
              type="text"
              value={plan.date}
              onChange={(e) => updateField("date", e.target.value)}
              placeholder="例如：2026年8月15日"
              className="w-full text-xs sm:text-sm px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-stone-700 mb-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              活動地點
            </label>
            <input
              type="text"
              value={plan.location}
              onChange={(e) => updateField("location", e.target.value)}
              placeholder="例如：台北國際會議中心 3F"
              className="w-full text-xs sm:text-sm px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="flex items-center gap-1 text-xs font-semibold text-stone-700 mb-1">
              <Building2 className="w-3.5 h-3.5 text-stone-400" />
              主辦 / 籌備單位
            </label>
            <input
              type="text"
              value={plan.organizer}
              onChange={(e) => updateField("organizer", e.target.value)}
              placeholder="例如：未來數位創新實驗室"
              className="w-full text-xs sm:text-sm px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Plan Content Textarea */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-stone-400" />
              該次活動計畫內容與成果說明 <span className="text-rose-500">*</span>
            </span>
            <span className="text-[11px] text-stone-600 font-normal">
              支援自由貼上議程、企劃宗旨、分組亮點或檢討回饋
            </span>
          </label>
          <textarea
            rows={5}
            value={plan.planContent}
            onChange={(e) => updateField("planContent", e.target.value)}
            placeholder="請輸入或貼上該次活動之企劃規劃、核心目標、各階段精彩成果或檢討數據...
例如：
1. 活動主旨與目標群體
2. 精彩活動環節與互動亮點
3. 具體成果數據（如參與人數、產出專案數）
4. 參與者正面回饋與後續計畫..."
            className="w-full text-xs sm:text-sm px-3.5 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600 focus:outline-none transition-all font-sans leading-relaxed"
          />
        </div>

        {/* Section: KEY METRICS Manual Input */}
        <div className="bg-stone-50/80 border border-stone-200/90 rounded-xl p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-600/10 text-amber-700 flex items-center justify-center font-bold">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-stone-900 flex items-center gap-2">
                  貳、關鍵績效指標統計 (KEY METRICS) 手動輸入
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                    手動輸入
                  </span>
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  自訂與填寫該次活動之核心關鍵指標數據（如：滿意度、人次、產出數），將直接帶入排版成果報告
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddMetric}
              className="px-3 py-1.5 bg-white hover:bg-amber-50 border border-stone-300 hover:border-amber-400 text-stone-700 hover:text-amber-800 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              新增指標項目
            </button>
          </div>

          {/* Metrics Card Grid */}
          {currentMetrics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-stone-200 rounded-xl p-3 shadow-2xs space-y-2 relative group hover:border-amber-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/50">
                      指標 #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMetric(idx)}
                      title="刪除此指標"
                      className="text-stone-400 hover:text-rose-600 p-1 rounded hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      指標數值 (Value)
                    </label>
                    <input
                      type="text"
                      value={metric.value}
                      onChange={(e) => handleMetricChange(idx, "value", e.target.value)}
                      placeholder="例：98.5% 或 12 組"
                      className="w-full text-base font-bold text-amber-700 px-2.5 py-1.5 bg-stone-50/70 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      指標項目名稱 (Label)
                    </label>
                    <input
                      type="text"
                      value={metric.label}
                      onChange={(e) => handleMetricChange(idx, "label", e.target.value)}
                      placeholder="例：參與者滿意度"
                      className="w-full text-xs text-stone-800 font-medium px-2.5 py-1.5 bg-stone-50/70 border border-stone-200 rounded-lg focus:bg-white focus:outline-none focus:border-amber-600 focus:ring-2 focus:ring-amber-600/20 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-white border border-dashed border-stone-300 rounded-xl space-y-2">
              <p className="text-xs text-stone-500">
                目前尚未新增關鍵績效指標
              </p>
              <button
                type="button"
                onClick={handleAddMetric}
                className="px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                點此手動新增第 1 個指標
              </button>
            </div>
          )}

          {/* Quick suggestions pills */}
          <div className="pt-2 border-t border-stone-200/70">
            <div className="text-[11px] text-stone-500 font-medium mb-1.5 flex items-center justify-between">
              <span>快速點選加入常用指標範本：</span>
              <span className="text-[10px] text-stone-400">點擊即可加入手動輸入清單</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {SUGGESTED_METRICS.map((sug, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => handleApplySuggestedMetric(sug)}
                  className="text-[11px] bg-white hover:bg-amber-50 text-stone-600 hover:text-amber-900 border border-stone-200 hover:border-amber-300 px-2.5 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                >
                  <Plus className="w-3 h-3 text-stone-400 group-hover:text-amber-600" />
                  <span>{sug.label}</span>
                  <span className="font-bold text-amber-700">{sug.value}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Layout Style Selector */}
        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-stone-700 mb-2">
            <Layout className="w-3.5 h-3.5 text-stone-400" />
            版面設計風格 (可隨時在預覽中切換)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {LAYOUT_STYLES.map((style) => {
              const Icon = style.icon;
              const isSelected = plan.preferredStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => updateField("preferredStyle", style.id)}
                  className={`text-left p-3 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "border-amber-600 bg-amber-50/50 ring-1 ring-amber-600"
                      : "border-stone-200 hover:border-stone-300 bg-stone-50/40"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${isSelected ? "text-amber-700" : "text-stone-500"}`} />
                    <span className="text-xs font-semibold text-stone-800">{style.label}</span>
                  </div>
                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-tight">
                    {style.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Theme Selector */}
        <div>
          <label className="flex items-center gap-1 text-xs font-semibold text-stone-700 mb-2">
            <Palette className="w-3.5 h-3.5 text-stone-400" />
            色彩基調主題
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {THEME_OPTIONS.map((theme) => {
              const isSelected = plan.preferredTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => updateField("preferredTheme", theme.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "border-stone-900 bg-stone-900 text-white shadow-xs"
                      : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${theme.bgClass}`} />
                  <span>{theme.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="flex flex-col sm:flex-row items-center gap-3 justify-end pt-1">
        <div className="text-xs text-stone-500 text-center sm:text-right">
          {photoCount > 0 ? (
            <span>已就緒 {photoCount} 張照片，準備執行智慧排版</span>
          ) : (
            <span className="text-amber-600">提示：建議先上傳照片或點擊上方「快速套用範例」體驗最佳效果</span>
          )}
        </div>

        <button
          type="button"
          disabled={isLoading || !plan.title.trim()}
          onClick={onSubmit}
          className={`w-full sm:w-auto px-6 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
            isLoading || !plan.title.trim()
              ? "bg-stone-200 text-stone-400 cursor-not-allowed"
              : "bg-amber-600 hover:bg-amber-700 text-white hover:shadow-md active:scale-98"
          }`}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>正在分析活動企劃並生成排版摘要...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>自動做好上傳圖片之版面設計與摘要說明</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
