import { ColorTheme, EventDigestData, KeyMetric, LayoutStyle } from "../types";

export interface SmartDigestInput {
  title?: string;
  planContent?: string;
  date?: string;
  location?: string;
  organizer?: string;
  photoCount?: number;
  keyMetrics?: KeyMetric[];
  preferredStyle?: LayoutStyle;
  preferredTheme?: ColorTheme;
}

export function generateSmartDigest(input: SmartDigestInput): EventDigestData {
  const title = input.title?.trim() || "跨界創新與卓越團隊成果展";
  const plan = input.planContent?.trim() || "";
  const count = Math.max(input.photoCount || 4, 4);
  const userMetrics = input.keyMetrics;

  const defaultMetrics: KeyMetric[] = [
    { label: "活動滿意度", value: "98.5%" },
    { label: "亮點產出", value: "12 項" },
    { label: "全程參與率", value: "100%" },
    { label: "正面回饋", value: "50+ 則" },
  ];

  return {
    headline: title ? `${title}・精彩紀實與成果綜述` : "共創卓越：年度活動亮點與紀實精華",
    subtitle:
      plan.length > 20
        ? plan.slice(0, 35) + "..."
        : "凝聚團隊向心力・深化多元協作・開啟卓越新篇章",
    executiveSummary: plan
      ? `本次活動聚焦於「${title}」，透過縝密的規劃與團隊的高效協同合作，順利落實各項環節。現場氛圍熱烈，參與者在多元互動與主題分享中深化了彼此的交流與默契。\n\n綜觀本次活動，不僅全面達成了預期的計畫目標，更激盪出跨領域的創新思維，為後續的長期發展與深化合作奠定了堅實的基礎。`
      : `本次活動匯聚多方力量與熱情參與，透過精心籌辦的豐富議程與互動體驗，創造了充實且極具啟發性的美好時光。\n\n全體與會者在歡笑與深度交流中共同見證了重要時刻，成果斐然，展現了無與倫比的凝聚力與執行力。`,
    keyMetrics: Array.isArray(userMetrics) && userMetrics.length > 0 ? userMetrics : defaultMetrics,
    highlights: [
      {
        title: "主題啟動與願景交流",
        description: "由核心籌備團隊引言，明確本次計畫的核心理念，迅速激發全場共鳴與投入熱情。",
      },
      {
        title: "沉浸式互動與實務協作",
        description: "設計多階段動態體驗，讓參與者在實際演練與討論中激盪出許多極具價值的創意點子。",
      },
      {
        title: "成果匯整與榮耀時刻",
        description: "統整全場關鍵進度與動人剪影，共同慶賀階段性成就，留下珍貴的影像與回憶。",
      },
    ],
    photoCaptions: Array.from({ length: count }).map((_, idx) => {
      const titles = [
        "盛大啟幕",
        "專注投入",
        "靈感激盪",
        "團隊合力",
        "成果呈現",
        "榮耀紀念",
        "真摯笑容",
        "圓滿合影",
      ];
      const captions = [
        "與會成員齊聚一堂，展現飽滿朝氣與期待。",
        "全神貫注於關鍵環節，紀錄深思與專注的動人瞬間。",
        "跨界交流激盪創新火花，現場討論氣氛熱烈無比。",
        "團隊齊心協力突破挑戰，展現緊密協作精神。",
        "精采展示具體成果，獲得全場一致喝采與肯定。",
        "留下珍貴紀錄，每一刻都凝聚著大家的用心與汗水。",
        "溫馨而真摯的互動瞬間，洋溢著豐收的喜悅。",
        "全體夥伴大合影，為本次精彩活動畫下完美句點。",
      ];
      return {
        title: titles[idx % titles.length],
        caption: captions[idx % captions.length],
      };
    }),
    quotes: "「每一次跨界激盪，都是讓創意思維在實踐中綻放的關鍵契機。」",
    recommendedLayout: input.preferredStyle || "magazine",
    recommendedColorTheme: input.preferredTheme || "slate",
    conclusion: "活動圓滿落幕，展現高度凝聚力與創造成果，奠定未來持續深化合作的堅實基石。",
  };
}
