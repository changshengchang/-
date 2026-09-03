import React from "react";
import { EventDigestData, UploadedPhoto, ColorTheme, EventPlanInput } from "../../types";
import { THEME_CONFIGS } from "../../utils/themeStyles";
import { Quote, Calendar, MapPin, Award, CheckCircle2 } from "lucide-react";

interface LayoutProps {
  digest: EventDigestData;
  photos: UploadedPhoto[];
  plan: EventPlanInput;
  theme: ColorTheme;
  onUpdateField?: (key: keyof EventDigestData, value: any) => void;
  isEditable?: boolean;
}

export const MagazineLayout: React.FC<LayoutProps> = ({
  digest,
  photos,
  plan,
  theme,
  onUpdateField,
  isEditable = false,
}) => {
  const themeCfg = THEME_CONFIGS[theme] || THEME_CONFIGS.slate;

  // Identify cover photo and gallery photos
  const coverPhoto = photos.find((p) => p.isCover) || photos[0];
  const galleryPhotos = photos.filter((p) => p.id !== coverPhoto?.id);

  return (
    <div className="w-full bg-white text-stone-900 p-8 sm:p-12 font-sans space-y-8 print:p-6 print:space-y-6">
      {/* Magazine Masthead Header */}
      <header className="border-b-2 border-stone-900 pb-5 space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-stone-500 uppercase">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-white text-[11px] font-bold ${themeCfg.headerBar}`}>
              SPECIAL REPORT
            </span>
            <span>活動專案紀實精華</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              {plan.date || "2026"}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              {plan.location || "活動現場"}
            </span>
          </div>
        </div>

        {/* Big Magazine Headline */}
        <div className="space-y-2 pt-2">
          {isEditable ? (
            <input
              type="text"
              value={digest.headline}
              onChange={(e) => onUpdateField?.("headline", e.target.value)}
              className="w-full text-2xl sm:text-4xl font-extrabold text-stone-950 tracking-tight border-b border-dashed border-stone-300 focus:outline-none"
            />
          ) : (
            <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-950 tracking-tight leading-tight">
              {digest.headline}
            </h1>
          )}

          {isEditable ? (
            <input
              type="text"
              value={digest.subtitle}
              onChange={(e) => onUpdateField?.("subtitle", e.target.value)}
              className="w-full text-sm sm:text-base font-medium text-stone-600 border-b border-dashed border-stone-300 focus:outline-none"
            />
          ) : (
            <p className="text-sm sm:text-base font-medium text-stone-600 leading-relaxed">
              {digest.subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 pt-1 border-t border-stone-200">
          <span>主辦單位：{plan.organizer || "活動籌備小組"}</span>
          <span>攝影紀錄：活動團隊典藏小組（共收錄 {photos.length} 張實錄照片）</span>
        </div>
      </header>

      {/* Main Feature Story + Hero Photo Layout */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Cover Photo (7 cols) */}
        {coverPhoto && (
          <div className="lg:col-span-7 space-y-2">
            <div className="relative rounded-xl overflow-hidden shadow-sm aspect-16/10 bg-stone-100 border border-stone-200">
              <img
                src={coverPhoto.dataUrl}
                alt={coverPhoto.name}
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-3 left-3 bg-stone-900/80 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-md font-medium">
                主視覺焦點
              </div>
            </div>
            <div className="flex items-baseline justify-between text-xs text-stone-500 px-1">
              <span className="font-semibold text-stone-800">
                {coverPhoto.captionTitle || digest.photoCaptions?.[0]?.title || "精彩全景"}
              </span>
              <span className="text-stone-500 italic">
                {coverPhoto.captionText || digest.photoCaptions?.[0]?.caption || "活動核心現場實錄"}
              </span>
            </div>
          </div>
        )}

        {/* Right Column: Executive Summary & Pull Quote (5 cols) */}
        <div className={`${coverPhoto ? "lg:col-span-5" : "lg:col-span-12"} space-y-5`}>
          {/* Executive Summary Paragraphs */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-stone-400 uppercase flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${themeCfg.headerBar}`} />
              活動摘要與背景觀點
            </h2>
            {isEditable ? (
              <textarea
                rows={6}
                value={digest.executiveSummary}
                onChange={(e) => onUpdateField?.("executiveSummary", e.target.value)}
                className="w-full text-xs sm:text-sm text-stone-700 leading-relaxed p-2 border border-dashed border-stone-300 rounded focus:outline-none"
              />
            ) : (
              <div className="text-xs sm:text-sm text-stone-700 leading-relaxed space-y-2 font-normal whitespace-pre-line">
                {digest.executiveSummary}
              </div>
            )}
          </div>

          {/* Pull Quote Box */}
          {digest.quotes && (
            <div className={`p-4 rounded-xl ${themeCfg.cardBg} border-l-4 ${themeCfg.quoteBorder} space-y-1`}>
              <Quote className="w-5 h-5 text-stone-400 mb-1" />
              <p className="text-xs sm:text-sm font-semibold italic text-stone-800 leading-snug">
                {digest.quotes}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Key Metrics Banner */}
      {digest.keyMetrics && digest.keyMetrics.length > 0 && (
        <section className={`p-5 rounded-xl ${themeCfg.badgeBg} border ${themeCfg.borderAccent}`}>
          <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 text-center sm:text-left">
            核心成效與指標數據 (Key Performance)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {digest.keyMetrics.map((metric, idx) => (
              <div key={idx} className="bg-white/80 rounded-lg p-3 shadow-xs">
                <div className={`text-xl sm:text-2xl font-black ${themeCfg.accentText}`}>
                  {metric.value}
                </div>
                <div className="text-xs text-stone-600 font-medium mt-0.5">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Highlights & Photo Grid Gallery */}
      <section className="space-y-5">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <h2 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-600" />
            活動亮點與紀實圖組
          </h2>
          <span className="text-xs text-stone-500">
            精選實拍紀實剪影
          </span>
        </div>

        {/* Highlights Cards */}
        {digest.highlights && digest.highlights.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {digest.highlights.map((item, idx) => (
              <div key={idx} className="p-3.5 bg-stone-50 rounded-lg border border-stone-200 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-900">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{item.title}</span>
                </div>
                <p className="text-[12px] text-stone-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Secondary Gallery Photos Grid */}
        {galleryPhotos.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
            {galleryPhotos.map((photo, idx) => {
              const captionData = digest.photoCaptions?.[idx + 1] || {
                title: photo.captionTitle || `亮點紀錄 #${idx + 1}`,
                caption: photo.captionText || "活動現場紀實",
              };
              return (
                <div
                  key={photo.id}
                  className="group bg-white rounded-lg border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow"
                >
                  <div className="aspect-4/3 w-full bg-stone-100 overflow-hidden">
                    <img
                      src={photo.dataUrl}
                      alt={photo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="p-2.5 space-y-0.5">
                    <div className="text-xs font-bold text-stone-800 truncate">
                      {photo.captionTitle || captionData.title}
                    </div>
                    <div className="text-[11px] text-stone-500 line-clamp-2 leading-tight">
                      {photo.captionText || captionData.caption}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Editorial Footer / Conclusion */}
      {digest.conclusion && (
        <footer className="pt-4 border-t border-stone-300 text-xs text-stone-500">
          <div className="text-stone-700">
            <span className="font-bold text-stone-900">總結與展望：</span>
            {digest.conclusion}
          </div>
        </footer>
      )}
    </div>
  );
};
