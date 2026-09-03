import React from "react";
import { EventDigestData, UploadedPhoto, ColorTheme, EventPlanInput } from "../../types";
import { THEME_CONFIGS } from "../../utils/themeStyles";
import { Sparkles, Calendar, MapPin, Tag } from "lucide-react";

interface LayoutProps {
  digest: EventDigestData;
  photos: UploadedPhoto[];
  plan: EventPlanInput;
  theme: ColorTheme;
  onUpdateField?: (key: keyof EventDigestData, value: any) => void;
  isEditable?: boolean;
}

export const GalleryLayout: React.FC<LayoutProps> = ({
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
      {/* Header with Artistic Flair */}
      <header className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${themeCfg.headerBar}`} />
            <span className="font-semibold uppercase tracking-widest text-stone-800">
              PHOTOGRAPHIC GALLERY & STORY
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>{plan.date}</span>
            <span>•</span>
            <span>{plan.location}</span>
          </div>
        </div>

        <div className="space-y-2">
          {isEditable ? (
            <input
              type="text"
              value={digest.headline}
              onChange={(e) => onUpdateField?.("headline", e.target.value)}
              className="w-full text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 border-b border-dashed border-stone-300 focus:outline-none"
            />
          ) : (
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
              {digest.headline}
            </h1>
          )}

          {isEditable ? (
            <input
              type="text"
              value={digest.subtitle}
              onChange={(e) => onUpdateField?.("subtitle", e.target.value)}
              className="w-full text-base text-stone-500 border-b border-dashed border-stone-300 focus:outline-none"
            />
          ) : (
            <p className="text-base text-stone-500 font-light">
              {digest.subtitle}
            </p>
          )}
        </div>
      </header>

      {/* Summary Card + Highlight Pills */}
      <div className={`p-6 rounded-2xl ${themeCfg.cardBg} border ${themeCfg.borderAccent} space-y-4`}>
        <div className="text-xs font-bold uppercase tracking-wider text-stone-400">
          活動精要觀點 (Essence)
        </div>
        {isEditable ? (
          <textarea
            rows={4}
            value={digest.executiveSummary}
            onChange={(e) => onUpdateField?.("executiveSummary", e.target.value)}
            className="w-full text-sm text-stone-800 leading-relaxed p-2 bg-white/80 border border-stone-300 rounded focus:outline-none"
          />
        ) : (
          <div className="text-sm sm:text-base text-stone-800 leading-relaxed font-normal whitespace-pre-line">
            {digest.executiveSummary}
          </div>
        )}

        {/* Highlight Chips */}
        {digest.highlights && digest.highlights.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {digest.highlights.map((h, i) => (
              <div
                key={i}
                className="bg-white px-3 py-1.5 rounded-full border border-stone-200 text-xs text-stone-700 flex items-center gap-1.5 shadow-2xs"
              >
                <Tag className="w-3 h-3 text-stone-400" />
                <span className="font-semibold">{h.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modern Dynamic Photo Wall */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
          <span>視覺影像展廊 (GALLERY REEL)</span>
          <span>{photos.length} 幀紀實</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {photos.map((photo, idx) => {
            const captionData = digest.photoCaptions?.[idx] || {
              title: photo.captionTitle || `瞬間 ${idx + 1}`,
              caption: photo.captionText || "精彩回顧",
            };
            const isLarge = idx === 0;

            return (
              <div
                key={photo.id}
                className={`group relative rounded-xl overflow-hidden bg-stone-100 border border-stone-200 shadow-xs hover:shadow-md transition-all ${
                  isLarge ? "sm:col-span-2 aspect-16/10" : "aspect-4/3"
                }`}
              >
                <img
                  src={photo.dataUrl}
                  alt={photo.name}
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />

                {/* Aesthetic Gradient Overlay & Caption */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/20 to-transparent flex flex-col justify-end p-4 text-white">
                  <div className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    {photo.captionTitle || captionData.title}
                  </div>
                  <div className="text-xs text-stone-200 line-clamp-2 mt-0.5 font-light">
                    {photo.captionText || captionData.caption}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pull Quote / Signature line */}
      {digest.quotes && (
        <div className="text-center py-4 border-y border-stone-200">
          <p className="text-sm sm:text-base italic text-stone-700 font-serif">
            {digest.quotes}
          </p>
        </div>
      )}

      {/* Footer */}
      <footer className="flex items-center justify-between text-xs text-stone-400 pt-2">
        <span>主辦單位：{plan.organizer || "活動工作團隊"}</span>
        <span>© {new Date().getFullYear()} All rights reserved.</span>
      </footer>
    </div>
  );
};
