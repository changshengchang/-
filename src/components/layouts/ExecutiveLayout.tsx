import React, { useState } from "react";
import { EventDigestData, UploadedPhoto, ColorTheme, EventPlanInput, KeyMetric } from "../../types";
import { THEME_CONFIGS } from "../../utils/themeStyles";
import { FileCheck2, Calendar, MapPin, Building2, BarChart3, Camera, CheckSquare, Plus, Trash2, X, Edit3 } from "lucide-react";

interface LayoutProps {
  digest: EventDigestData;
  photos: UploadedPhoto[];
  plan: EventPlanInput;
  theme: ColorTheme;
  onUpdateField?: (key: keyof EventDigestData, value: any) => void;
  isEditable?: boolean;
}

export const ExecutiveLayout: React.FC<LayoutProps> = ({
  digest,
  photos,
  plan,
  theme,
  onUpdateField,
  isEditable = false,
}) => {
  const themeCfg = THEME_CONFIGS[theme] || THEME_CONFIGS.slate;
  const [isLocalEditingMetrics, setIsLocalEditingMetrics] = useState<boolean>(false);

  const handleUpdateMetric = (index: number, field: "label" | "value", val: string) => {
    const list = [...(digest.keyMetrics || [])];
    if (list[index]) {
      list[index] = { ...list[index], [field]: val };
      onUpdateField?.("keyMetrics", list);
    }
  };

  const handleAddMetric = () => {
    const list = [...(digest.keyMetrics || [])];
    list.push({ label: "新成果指標", value: "100%" });
    onUpdateField?.("keyMetrics", list);
    setIsLocalEditingMetrics(true);
  };

  const handleRemoveMetric = (index: number) => {
    const list = (digest.keyMetrics || []).filter((_, i) => i !== index);
    onUpdateField?.("keyMetrics", list);
  };

  return (
    <div className="w-full bg-white text-stone-900 p-8 sm:p-12 font-sans space-y-7 print:p-6 print:space-y-5">
      {/* Official Header with Dual Accent Lines */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b-2 border-stone-900 pb-2">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-white text-xs font-bold tracking-wide rounded ${themeCfg.headerBar}`}>
              成果紀實報告書
            </span>
            <span className="text-xs font-mono text-stone-500">
              DOC-EVT-{new Date().getFullYear()}
            </span>
          </div>
          <div className="text-xs font-medium text-stone-500">
            結案報告 / 專案存查
          </div>
        </div>

        {/* Title & Metadata Card */}
        <div className="pt-2 space-y-2">
          {isEditable ? (
            <input
              type="text"
              value={digest.headline}
              onChange={(e) => onUpdateField?.("headline", e.target.value)}
              className="w-full text-2xl sm:text-3xl font-extrabold text-stone-950 border-b border-dashed border-stone-300 focus:outline-none"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-950 leading-tight">
              {digest.headline}
            </h1>
          )}

          {isEditable ? (
            <input
              type="text"
              value={digest.subtitle}
              onChange={(e) => onUpdateField?.("subtitle", e.target.value)}
              className="w-full text-sm font-medium text-stone-600 border-b border-dashed border-stone-300 focus:outline-none"
            />
          ) : (
            <p className="text-sm font-medium text-stone-600">
              {digest.subtitle}
            </p>
          )}

          {/* Metadata Table Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 text-xs bg-stone-50 p-3 rounded-lg border border-stone-200">
            <div>
              <span className="text-stone-400 block mb-0.5">活動日期</span>
              <span className="font-semibold text-stone-800 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-500" />
                {plan.date || "未填"}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block mb-0.5">主辦單位</span>
              <span className="font-semibold text-stone-800 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-stone-500" />
                {plan.organizer || "活動籌備單位"}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block mb-0.5">活動地點</span>
              <span className="font-semibold text-stone-800 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-500" />
                {plan.location || "活動現場"}
              </span>
            </div>
            <div>
              <span className="text-stone-400 block mb-0.5">影像附件</span>
              <span className="font-semibold text-stone-800 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-stone-500" />
                實拍附圖 {photos.length} 幀
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Executive Summary Block */}
      <div className="border border-stone-200 rounded-xl p-5 bg-stone-50/50 space-y-2">
        <h2 className="text-xs font-bold tracking-wider text-stone-600 uppercase flex items-center gap-1.5">
          <FileCheck2 className="w-4 h-4 text-stone-800" />
          壹、活動執行綜述與執行成效摘要
        </h2>
        {isEditable ? (
          <textarea
            rows={5}
            value={digest.executiveSummary}
            onChange={(e) => onUpdateField?.("executiveSummary", e.target.value)}
            className="w-full text-xs sm:text-sm text-stone-800 leading-relaxed p-2 bg-white border border-stone-300 rounded focus:outline-none"
          />
        ) : (
          <div className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal whitespace-pre-line">
            {digest.executiveSummary}
          </div>
        )}
      </div>

      {/* Key Metrics Indicator Bar - Manual Input & Display */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider text-stone-700 uppercase flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-stone-900" />
            貳、關鍵績效指標統計 (KEY METRICS)
          </h2>
          {/* Manual input action buttons */}
          <div className="flex items-center gap-2 no-print">
            {isLocalEditingMetrics ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleAddMetric}
                  className="text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                  新增指標
                </button>
                <button
                  type="button"
                  onClick={() => setIsLocalEditingMetrics(false)}
                  className="text-xs text-stone-800 bg-stone-200 hover:bg-stone-300 px-2.5 py-0.5 rounded-md font-semibold cursor-pointer transition-colors"
                >
                  完成修改
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsLocalEditingMetrics(true)}
                className="text-xs text-stone-500 hover:text-amber-800 flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-stone-100 cursor-pointer transition-colors"
                title="手動輸入與編輯各項績效指標"
              >
                <Edit3 className="w-3 h-3 text-stone-400" />
                <span>手動輸入/修改指標</span>
              </button>
            )}
          </div>
        </div>

        {(isEditable || isLocalEditingMetrics) ? (
          <div className="space-y-3 p-3.5 bg-amber-50/50 border-2 border-dashed border-amber-300 rounded-xl">
            <div className="flex items-center justify-between text-xs text-stone-600 font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                正在進行指標手動輸入 (可直接編輯數值與名稱)
              </span>
              <span className="text-[11px] text-stone-500">共 {digest.keyMetrics?.length || 0} 項指標</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {(digest.keyMetrics || []).map((metric, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-stone-200 hover:border-amber-500 rounded-lg shadow-2xs relative group space-y-2 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-900 bg-amber-100/70 px-1.5 py-0.5 rounded">
                      指標 #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMetric(idx)}
                      title="刪除此指標"
                      className="text-stone-400 hover:text-rose-600 p-0.5 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block font-semibold mb-0.5">
                      指標數值 (Value)
                    </label>
                    <input
                      type="text"
                      value={metric.value}
                      onChange={(e) => handleUpdateMetric(idx, "value", e.target.value)}
                      placeholder="例：98.5% 或 12 組"
                      className={`w-full text-lg font-bold ${themeCfg.accentText} bg-stone-50/80 px-2 py-1 rounded border border-stone-200 focus:bg-white focus:outline-none focus:border-amber-600`}
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-400 block font-semibold mb-0.5">
                      指標項目名稱 (Label)
                    </label>
                    <input
                      type="text"
                      value={metric.label}
                      onChange={(e) => handleUpdateMetric(idx, "label", e.target.value)}
                      placeholder="例：參與者滿意度"
                      className="w-full text-xs text-stone-800 font-medium bg-stone-50/80 px-2 py-1 rounded border border-stone-200 focus:bg-white focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAddMetric}
                className="text-xs text-amber-900 bg-white hover:bg-amber-100 border border-amber-300 px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                新增指標項目
              </button>

              <button
                type="button"
                onClick={() => setIsLocalEditingMetrics(false)}
                className="text-xs text-stone-700 hover:text-stone-900 underline cursor-pointer"
              >
                完成並預覽排版效果
              </button>
            </div>
          </div>
        ) : (
          (digest.keyMetrics && digest.keyMetrics.length > 0) ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {digest.keyMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  onClick={() => setIsLocalEditingMetrics(true)}
                  title="點擊以手動修改此指標"
                  className="p-3 bg-white border border-stone-200 hover:border-amber-400 rounded-lg text-center shadow-xs cursor-pointer transition-all hover:shadow-sm group relative"
                >
                  <div className={`text-xl font-bold ${themeCfg.accentText}`}>
                    {metric.value}
                  </div>
                  <div className="text-xs text-stone-500 font-medium mt-0.5 group-hover:text-stone-800 transition-colors">
                    {metric.label}
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 text-[10px] text-amber-700 bg-amber-50 rounded px-1 transition-opacity no-print">
                    點擊修改
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div
              onClick={() => setIsLocalEditingMetrics(true)}
              className="text-center py-4 bg-stone-50 hover:bg-amber-50/50 border border-dashed border-stone-300 rounded-lg text-xs text-stone-500 cursor-pointer transition-colors"
            >
              目前無關鍵績效指標，點此手動新增指標項目
            </div>
          )
        )}
      </div>

      {/* Structured Photo Grid (Formal Presentation) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-wider text-stone-600 uppercase flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-stone-800" />
            參、活動現場實景紀實影像一覽
          </h2>
          <span className="text-xs text-stone-500">依時序編號排定</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, idx) => {
            const captionData = digest.photoCaptions?.[idx] || {
              title: photo.captionTitle || `圖示 ${idx + 1}`,
              caption: photo.captionText || "實施進度紀錄",
            };
            return (
              <div
                key={photo.id}
                className="border border-stone-200 rounded-lg overflow-hidden bg-white shadow-xs flex flex-col"
              >
                <div className="aspect-16/10 bg-stone-100 overflow-hidden relative">
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                  <span className="absolute top-2 left-2 bg-stone-900/85 text-white text-[10px] font-mono px-2 py-0.5 rounded">
                    附圖 {idx + 1}
                  </span>
                  {photo.isCover && (
                    <span className="absolute top-2 right-2 bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                      主圖
                    </span>
                  )}
                </div>
                <div className="p-3 text-left space-y-1 bg-stone-50/50 flex-1">
                  <div className="text-xs font-bold text-stone-800">
                    {photo.captionTitle || captionData.title}
                  </div>
                  <div className="text-[11px] text-stone-600 leading-snug">
                    {photo.captionText || captionData.caption}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Highlight Bullet Points */}
      {digest.highlights && digest.highlights.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold tracking-wider text-stone-600 uppercase flex items-center gap-1.5">
            <CheckSquare className="w-4 h-4 text-stone-800" />
            肆、實施重點評析與具體亮點
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {digest.highlights.map((item, idx) => (
              <div key={idx} className="p-3 bg-stone-50 rounded-lg border border-stone-200 text-xs">
                <div className="font-bold text-stone-900 mb-1">
                  {idx + 1}. {item.title}
                </div>
                <div className="text-stone-600 leading-relaxed">
                  {item.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conclusion & Official Sign-off */}
      <div className="pt-4 border-t-2 border-stone-900 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="sm:col-span-2 text-stone-700">
          <span className="font-bold text-stone-900 block mb-1">伍、綜合結語與後續建議</span>
          <p className="leading-relaxed">
            {digest.conclusion || "本專案圓滿達成既定目標，綜效顯著，建請持續追蹤成果並列入下一階段推廣依據。"}
          </p>
        </div>
        <div className="p-3 bg-stone-50 border border-stone-200 rounded text-center space-y-1">
          <span className="text-[11px] text-stone-400 block">承辦簽核主管</span>
          <div className="h-6 flex items-center justify-center font-serif text-stone-400 italic text-sm">
            [ 已核閱審訖 ]
          </div>
          <span className="text-[10px] text-stone-400 font-mono">
            {plan.date || new Date().toISOString().slice(0, 10)}
          </span>
        </div>
      </div>
    </div>
  );
};
