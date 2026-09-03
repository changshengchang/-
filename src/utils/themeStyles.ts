import { ColorTheme, PageFormat } from "../types";

export interface ThemeColors {
  name: string;
  badgeBg: string;
  badgeText: string;
  accentText: string;
  accentBg: string;
  borderAccent: string;
  gradientFrom: string;
  gradientTo: string;
  cardBg: string;
  headerBar: string;
  quoteBorder: string;
  buttonBg: string;
}

export const THEME_CONFIGS: Record<ColorTheme, ThemeColors> = {
  slate: {
    name: "典雅石墨藍",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-800",
    accentText: "text-slate-800",
    accentBg: "bg-slate-900",
    borderAccent: "border-slate-300",
    gradientFrom: "from-slate-900",
    gradientTo: "to-slate-800",
    cardBg: "bg-slate-50/80",
    headerBar: "bg-slate-900",
    quoteBorder: "border-slate-700",
    buttonBg: "bg-slate-900 hover:bg-slate-800 text-white",
  },
  terracotta: {
    name: "溫潤陶瓦紅",
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-950",
    accentText: "text-amber-900",
    accentBg: "bg-stone-900",
    borderAccent: "border-amber-200",
    gradientFrom: "from-stone-900",
    gradientTo: "to-amber-950",
    cardBg: "bg-amber-50/70",
    headerBar: "bg-amber-900",
    quoteBorder: "border-amber-700",
    buttonBg: "bg-stone-900 hover:bg-stone-800 text-white",
  },
  forest: {
    name: "自然森綠",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-950",
    accentText: "text-emerald-900",
    accentBg: "bg-emerald-900",
    borderAccent: "border-emerald-200",
    gradientFrom: "from-emerald-950",
    gradientTo: "to-teal-900",
    cardBg: "bg-emerald-50/60",
    headerBar: "bg-emerald-900",
    quoteBorder: "border-emerald-700",
    buttonBg: "bg-emerald-900 hover:bg-emerald-800 text-white",
  },
  amber: {
    name: "秋陽琥珀",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-950",
    accentText: "text-amber-900",
    accentBg: "bg-amber-800",
    borderAccent: "border-amber-200",
    gradientFrom: "from-amber-950",
    gradientTo: "to-stone-900",
    cardBg: "bg-amber-50/60",
    headerBar: "bg-amber-900",
    quoteBorder: "border-amber-600",
    buttonBg: "bg-amber-800 hover:bg-amber-900 text-white",
  },
  indigo: {
    name: "前瞻科技藍",
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-950",
    accentText: "text-indigo-900",
    accentBg: "bg-indigo-900",
    borderAccent: "border-indigo-200",
    gradientFrom: "from-indigo-950",
    gradientTo: "to-blue-900",
    cardBg: "bg-indigo-50/60",
    headerBar: "bg-indigo-900",
    quoteBorder: "border-indigo-700",
    buttonBg: "bg-indigo-900 hover:bg-indigo-800 text-white",
  },
};

export const PAGE_FORMAT_CONFIGS: Record<PageFormat, { name: string; label: string; aspectClass: string; maxWidth: string }> = {
  "a4-portrait": {
    name: "A4 直式報告",
    label: "標準列印與公務提報 (1:1.414)",
    aspectClass: "min-h-[1120px] aspect-[1/1.414]",
    maxWidth: "max-w-[794px]",
  },
  "landscape-slide": {
    name: "16:9 簡報投影",
    label: "螢幕展示與投影片 (16:9)",
    aspectClass: "min-h-[640px] aspect-[16/9]",
    maxWidth: "max-w-[1100px]",
  },
  "square-post": {
    name: "社群正方多圖",
    label: "社群分享與行動閱讀 (1:1)",
    aspectClass: "min-h-[800px] aspect-square",
    maxWidth: "max-w-[800px]",
  },
};
