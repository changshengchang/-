import React from "react";
import { EventDigestData, UploadedPhoto, ColorTheme, EventPlanInput } from "../../types";
import { THEME_CONFIGS } from "../../utils/themeStyles";
import { Clock, Calendar, MapPin, CheckCircle2 } from "lucide-react";

interface LayoutProps {
  digest: EventDigestData;
  photos: UploadedPhoto[];
  plan: EventPlanInput;
  theme: ColorTheme;
  onUpdateField?: (key: keyof EventDigestData, value: any) => void;
  isEditable?: boolean;
}

export const TimelineLayout: React.FC<LayoutProps> = ({
  digest,
  photos,
  plan,
  theme,
  onUpdateField,
  isEditable = false,
}) => {
  const themeCfg = THEME_CONFIGS[theme] || THEME_CONFIGS.slate;

  return (
    <div className="w-full bg-white text-stone-900 p-8 sm:p-12 font-sans space-y-8 print:p-6 print:space-y-6">
      {/* Header */}
      <header className="border-b-2 border-stone-800 pb-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
          <span className={`px-2 py-0.5 rounded text-white text-[11px] font-bold ${themeCfg.headerBar}`}>
            CHRONICLE TIMELINE
          </span>
          <span>活動時序紀實歷程</span>
        </div>

        <div className="space-y-1">
          {isEditable ? (
            <input
              type="text"
              value={digest.headline}
              onChange={(e) => onUpdateField?.("headline", e.target.value)}
              className="w-full text-2xl sm:text-3xl font-extrabold text-stone-950 border-b border-dashed border-stone-300 focus:outline-none"
            />
          ) : (
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-950">
              {digest.headline}
            </h1>
          )}

          <div className="flex items-center gap-4 text-xs text-stone-500 pt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              {plan.date}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              {plan.location}
            </span>
            <span>主辦：{plan.organizer}</span>
          </div>
        </div>
      </header>

      {/* Brief Executive Summary Callout */}
      <div className={`p-4 rounded-xl ${themeCfg.cardBg} border ${themeCfg.borderAccent}`}>
        <div className="text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
          活動總結綜覽
        </div>
        {isEditable ? (
          <textarea
            rows={3}
            value={digest.executiveSummary}
            onChange={(e) => onUpdateField?.("executiveSummary", e.target.value)}
            className="w-full text-xs sm:text-sm text-stone-800 leading-relaxed p-2 bg-white/80 border border-stone-300 rounded focus:outline-none"
          />
        ) : (
          <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-normal whitespace-pre-line">
            {digest.executiveSummary}
          </p>
        )}
      </div>

      {/* Vertical Timeline Progression */}
      <div className="relative pl-6 sm:pl-8 border-l-2 border-stone-200 space-y-8 ml-2 sm:ml-4">
        {photos.map((photo, idx) => {
          const captionData = digest.photoCaptions?.[idx] || {
            title: photo.captionTitle || `階段 ${idx + 1}`,
            caption: photo.captionText || "進行紀實",
          };

          return (
            <div key={photo.id} className="relative group">
              {/* Timeline Node Icon */}
              <div className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-6 h-6 rounded-full bg-white border-2 border-stone-800 flex items-center justify-center text-[10px] font-bold text-stone-800 shadow-xs`}>
                {idx + 1}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-stone-50/70 p-3 rounded-xl border border-stone-200">
                {/* Photo Thumbnail */}
                <div className="sm:col-span-5 rounded-lg overflow-hidden aspect-16/10 bg-stone-200">
                  <img
                    src={photo.dataUrl}
                    alt={photo.name}
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Content */}
                <div className="sm:col-span-7 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-stone-900">
                      {photo.captionTitle || captionData.title}
                    </span>
                    <span className="text-[10px] bg-stone-200 text-stone-700 px-2 py-0.5 rounded-full font-mono">
                      進程 0{idx + 1}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    {photo.captionText || captionData.caption}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metrics & Conclusion */}
      {digest.keyMetrics && digest.keyMetrics.length > 0 && (
        <div className="pt-4 border-t border-stone-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {digest.keyMetrics.map((m, i) => (
            <div key={i} className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <div className={`text-lg font-bold ${themeCfg.accentText}`}>{m.value}</div>
              <div className="text-xs text-stone-500 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Conclusion */}
      {digest.conclusion && (
        <div className="text-xs text-stone-600 border-t border-stone-200 pt-3 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{digest.conclusion}</p>
        </div>
      )}
    </div>
  );
};
