export interface UploadedPhoto {
  id: string;
  name: string;
  dataUrl: string;
  size?: number;
  captionTitle?: string;
  captionText?: string;
  isCover?: boolean;
}

export type LayoutStyle = "magazine" | "executive" | "gallery" | "chronicle";

export type ColorTheme = "slate" | "terracotta" | "forest" | "amber" | "indigo";

export type PageFormat = "a4-portrait" | "landscape-slide" | "square-post";

export interface KeyMetric {
  label: string;
  value: string;
}

export interface HighlightItem {
  title: string;
  description: string;
}

export interface PhotoCaption {
  title: string;
  caption: string;
}

export interface EventDigestData {
  headline: string;
  subtitle: string;
  executiveSummary: string;
  keyMetrics: KeyMetric[];
  highlights: HighlightItem[];
  photoCaptions: PhotoCaption[];
  quotes: string;
  recommendedLayout: LayoutStyle;
  recommendedColorTheme: ColorTheme;
  conclusion: string;
}

export interface EventPlanInput {
  title: string;
  date: string;
  location: string;
  organizer: string;
  planContent: string;
  preferredStyle: LayoutStyle;
  preferredTheme: ColorTheme;
  keyMetrics?: KeyMetric[];
}
