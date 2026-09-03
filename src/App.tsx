import React, { useState, useEffect } from "react";
import { 
  UploadedPhoto, 
  EventPlanInput, 
  EventDigestData, 
  LayoutStyle, 
  ColorTheme, 
  PageFormat 
} from "./types";
import { SAMPLE_PRESETS } from "./data/samplePresets";
import { PhotoUploader } from "./components/PhotoUploader";
import { EventForm } from "./components/EventForm";
import { LayoutCanvas } from "./components/LayoutCanvas";
import { ExportToolbar } from "./components/ExportToolbar";
import { convertRemoteImageToDataUrl } from "./utils/exportUtils";
import { generateSmartDigest } from "./utils/smartEngine";
import { 
  Sparkles, 
  Download, 
  Layers, 
  FileText, 
  Image as ImageIcon,
  CheckCircle,
  HelpCircle,
  Eye,
  Sliders,
  ChevronRight,
  BookOpen
} from "lucide-react";

export default function App() {
  const initialPreset = SAMPLE_PRESETS[0];

  // Primary state
  const [photos, setPhotos] = useState<UploadedPhoto[]>(initialPreset.photos);
  const [plan, setPlan] = useState<EventPlanInput>(initialPreset.plan);
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>(initialPreset.plan.preferredStyle);
  const [theme, setTheme] = useState<ColorTheme>(initialPreset.plan.preferredTheme);
  const [pageFormat, setPageFormat] = useState<PageFormat>("a4-portrait");
  const [isEditable, setIsEditable] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"input" | "preview">("preview");

  // Initial synthesized digest data so preview works instantly on launch
  const [digest, setDigest] = useState<EventDigestData>({
    headline: "2026 跨界數位創新黑客松成果發表會",
    subtitle: "以 Generative AI 賦能業務創新・36小時極限黑客松實錄與落地精華",
    executiveSummary: `本次黑客松匯聚跨部門技術、產品與設計夥伴，透過 36 小時不間斷密集衝刺，聚焦於生成式 AI 落地與永續流程自動化。現場激盪出源源不絕的創意火花，展現卓越的跨界協同作戰力。\n\n全體 12 組團隊皆成功交付運行原型（Working Prototype），其中 4 項具備高度商業潛力的雛型已正式排入下一季度的產品核心 Roadmap，達成超越預期的技術驗證與團隊凝聚成果。`,
    keyMetrics: [
      { label: "參與者滿意度", value: "98.5%" },
      { label: "產出原型專案", value: "12 組" },
      { label: "落地專利雛型", value: "4 項" },
      { label: "極限攻堅時數", value: "36 h" },
    ],
    highlights: [
      {
        title: "主題前瞻與實務演繹",
        description: "特邀產官學權威專家剖析全球生成式 AI 趨勢，奠定競賽宏觀思維。",
      },
      {
        title: "深度跨域黑客攻堅",
        description: "破除部門藩籬，工程師與產品經理無縫合作，在深夜將藍圖化為實際可測程式碼。",
      },
      {
        title: "成果展示與榮耀加冕",
        description: "全場進行 5 分鐘高壓 Demo，評審盛讚方案之實用性與成熟度。",
      },
    ],
    photoCaptions: [
      { title: "主題演講開場", caption: "特邀產學權威專家剖析全球智慧科技前瞻趨勢，全場座無虛席。" },
      { title: "跨界協作激盪", caption: "各組隊員密集討論專案架構與使用者旅程，白板寫滿創新思路。" },
      { title: "深夜衝刺實作", caption: "工程與設計夥伴並肩作戰，將創新想法轉化為流暢可用的數位雛型。" },
      { title: "榮耀頒獎時刻", caption: "優勝團隊登台受獎並分享研發心路歷程，全場報以熱烈掌聲。" },
      { title: "全體大合影", caption: "全體參賽選手、評審與工作人員留下珍貴大合影，共慶圓滿成功。" },
    ],
    quotes: "「唯有打破邊界的跨領域協作，才能真正催生顛覆傳統的智慧新解方。」",
    recommendedLayout: "magazine",
    recommendedColorTheme: "indigo",
    conclusion: "本屆黑客松圓滿收官，不僅驗證了新一代技術的可行性，更深化了團隊的信任與創新文化，成果斐然！",
  });

  // Automatically inline any remote/preset images to local Base64 in background
  // to guarantee instant rendering, zero CORS taint, and foolproof exports
  useEffect(() => {
    let isCurrent = true;
    const hasRemotePhotos = photos.some((p) => p.dataUrl && p.dataUrl.startsWith("http"));
    if (!hasRemotePhotos) return;

    Promise.all(
      photos.map(async (p) => {
        if (p.dataUrl && p.dataUrl.startsWith("http")) {
          const inlined = await convertRemoteImageToDataUrl(p.dataUrl);
          return { ...p, dataUrl: inlined || p.dataUrl };
        }
        return p;
      })
    ).then((updated) => {
      if (isCurrent) {
        setPhotos(updated);
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [photos]);

  // Load a preset template
  const handleSelectPreset = (presetId: string) => {
    const found = SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    setPhotos(found.photos);
    setPlan(found.plan);
    setLayoutStyle(found.plan.preferredStyle);
    setTheme(found.plan.preferredTheme);
    if (found.plan.keyMetrics) {
      setDigest((prev) => ({
        ...prev,
        keyMetrics: found.plan.keyMetrics!,
      }));
    }
    // Auto-generate or update digest for the new preset
    handleGenerateDigestWithData(found.plan, found.photos);
  };

  // Generate Digest using server-side Gemini API
  const handleGenerateDigest = async () => {
    await handleGenerateDigestWithData(plan, photos);
  };

  const handleGenerateDigestWithData = async (
    targetPlan: EventPlanInput,
    targetPhotos: UploadedPhoto[]
  ) => {
    setIsLoading(true);
    try {
      let digestResult: any = null;

      // 1. Attempt server-side Gemini generation
      try {
        const response = await fetch("/api/analyze-event", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: targetPlan.title,
            planContent: targetPlan.planContent,
            date: targetPlan.date,
            location: targetPlan.location,
            organizer: targetPlan.organizer,
            keyMetrics: targetPlan.keyMetrics || digest?.keyMetrics,
            photoCount: targetPhotos.length,
            photos: targetPhotos.slice(0, 3).map((p) => ({
              id: p.id,
              name: p.name,
              dataUrl: p.dataUrl.length < 500000 ? p.dataUrl : undefined,
            })),
            preferredStyle: targetPlan.preferredStyle,
          }),
        });

        const contentType = response.headers.get("content-type") || "";
        if (response.ok && contentType.includes("application/json")) {
          const resJson = await response.json();
          if (resJson && resJson.success && resJson.data) {
            digestResult = resJson.data;
          }
        }
      } catch (apiErr) {
        console.warn("Server AI digest generation unavailable, using smart engine:", apiErr);
      }

      // 2. Fallback to intelligent client-side generation if server was unreachable or returned non-JSON (e.g. Vercel static 404)
      if (!digestResult) {
        digestResult = generateSmartDigest({
          title: targetPlan.title,
          planContent: targetPlan.planContent,
          date: targetPlan.date,
          location: targetPlan.location,
          organizer: targetPlan.organizer,
          photoCount: targetPhotos.length,
          keyMetrics: targetPlan.keyMetrics || digest?.keyMetrics,
          preferredStyle: targetPlan.preferredStyle,
          preferredTheme: targetPlan.preferredTheme,
        });
      }

      const finalDigest = { ...digestResult };
      // Strictly preserve manual key metrics if specified by user
      if (targetPlan.keyMetrics && targetPlan.keyMetrics.length > 0) {
        finalDigest.keyMetrics = targetPlan.keyMetrics;
      }
      setDigest(finalDigest);
      if (digestResult.recommendedLayout) {
        setLayoutStyle(digestResult.recommendedLayout);
      }
      if (digestResult.recommendedColorTheme) {
        setTheme(digestResult.recommendedColorTheme);
      }
      setActiveTab("preview");
    } catch (err) {
      console.error("Failed to generate digest:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDigestField = (key: keyof EventDigestData, value: any) => {
    if (!digest) return;
    setDigest((prev) => ({
      ...prev,
      [key]: value,
    }));
    if (key === "keyMetrics") {
      setPlan((prev) => ({
        ...prev,
        keyMetrics: value,
      }));
    }
  };

  const handlePlanChange = (updatedPlan: EventPlanInput) => {
    setPlan(updatedPlan);
    if (updatedPlan.keyMetrics) {
      setDigest((prev) => ({
        ...prev,
        keyMetrics: updatedPlan.keyMetrics!,
      }));
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col selection:bg-amber-100 selection:text-amber-900">
      {/* Top Application Navigation */}
      <header className="no-print sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
                活動紀實與圖片排版摘要器
                <span className="hidden sm:inline-block text-[11px] bg-amber-100 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                  AI 智慧排版
                </span>
              </h1>
              <p className="text-xs text-stone-500 hidden sm:block">
                上傳活動照片及企劃・自動排版設計與內容摘要・一鍵匯出 PDF/相片檔
              </p>
            </div>
          </div>

          {/* Step Indicator / Tab Switcher */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab("input")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "input"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>1. 照片與企劃</span>
              <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 text-[10px] flex items-center justify-center font-bold">
                {photos.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "preview"
                  ? "bg-white text-stone-900 shadow-xs"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-amber-600" />
              <span>2. 排版預覽與下載</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Step Guide Banner (When on Input Tab) */}
        {activeTab === "input" && (
          <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-5 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">上傳若干張照片</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    拖曳或選取活動現場精彩實照，可自訂封面與排列順序。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">填寫企劃內容</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    貼上活動企劃、目標與流程，AI 將自動提煉專業摘要與指標。
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900">智慧排版與下載</h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    自動生成雜誌/公務報告版面，隨時下載向量 PDF 或高畫質相片。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Upload & Input Panel */}
        {activeTab === "input" ? (
          <div className="space-y-6 animate-fadeIn">
            {/* 1. Photo Uploader Component */}
            <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs">
              <PhotoUploader
                photos={photos}
                onPhotosChange={setPhotos}
              />
            </div>

            {/* 2. Event Plan Form Component */}
            <EventForm
              plan={plan}
              onChange={handlePlanChange}
              onSubmit={handleGenerateDigest}
              isLoading={isLoading}
              onSelectPreset={handleSelectPreset}
              photoCount={photos.length}
            />
          </div>
        ) : (
          /* Tab 2: Layout Preview, Customization & Download Panel */
          <div className="space-y-6 animate-fadeIn">
            {/* Step 3: Export & Control Toolbar */}
            <ExportToolbar
              currentLayout={layoutStyle}
              onLayoutChange={setLayoutStyle}
              currentTheme={theme}
              onThemeChange={setTheme}
              currentFormat={pageFormat}
              onFormatChange={setPageFormat}
              isEditable={isEditable}
              onToggleEditable={() => setIsEditable(!isEditable)}
              onRegenerate={handleGenerateDigest}
              isRegenerating={isLoading}
              eventTitle={plan.title}
            />

            {/* Layout Canvas Display */}
            <div id="canvas-container">
              <LayoutCanvas
                digest={digest}
                photos={photos}
                plan={plan}
                layoutStyle={layoutStyle}
                theme={theme}
                pageFormat={pageFormat}
                isEditable={isEditable}
                onUpdateField={handleUpdateDigestField}
              />
            </div>

            {/* Bottom Quick Switch / Edit Prompt */}
            <div className="no-print bg-white rounded-xl border border-stone-200 p-4 text-center text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>
                  若需要調整照片、新增照片或更改企劃內容，可隨時點擊返回第一步修改。
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("input")}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                返回修改照片與企劃內容
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="no-print mt-auto border-t border-stone-200 bg-white py-4 text-center text-xs text-stone-400">
        <p>活動紀實與圖片排版摘要器・專為活動企劃、成果彙整與圖文發布打造</p>
      </footer>
    </div>
  );
}
