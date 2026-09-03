import { GoogleGenAI, Type } from "@google/genai";

function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { "User-Agent": "aistudio-build" } },
  });
}

function generateSmartFallback(body: any) {
  const title = body.title?.trim() || "跨界創新與卓越團隊成果展";
  const plan = body.planContent?.trim() || "";
  const count = Math.max(body.photoCount || 4, 4);
  const userMetrics = body.keyMetrics || body.customKeyMetrics;

  return {
    headline: title ? `${title}・精彩紀實與成果綜述` : "共創卓越：年度活動亮點與紀實精華",
    subtitle:
      plan.length > 20
        ? plan.slice(0, 35) + "..."
        : "凝聚團隊向心力・深化多元協作・開啟卓越新篇章",
    executiveSummary: plan
      ? `本次活動聚焦於「${title}」，透過縝密的規劃與團隊的高效協同合作，順利落實各項環節。現場氛圍熱烈，參與者在多元互動與主題分享中深化了彼此的交流與默契。\n\n綜觀本次活動，不僅全面達成了預期的計畫目標，更激盪出跨領域的創新思維，為後續的長期發展與深化合作奠定了堅實的基礎。`
      : `本次活動匯聚多方力量與熱情參與，透過精心籌辦的豐富議程與互動體驗，創造了充實且極具啟發性的美好時光。\n\n全體與會者在歡笑與深度交流中共同見證了重要時刻，成果斐然，展現了無與倫比的凝聚力與執行力。`,
    keyMetrics:
      Array.isArray(userMetrics) && userMetrics.length > 0
        ? userMetrics
        : [
            { label: "活動滿意度", value: "98.5%" },
            { label: "亮點產出", value: "12 項" },
            { label: "全程參與率", value: "100%" },
            { label: "正面回饋", value: "50+ 則" },
          ],
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
    recommendedLayout: body.preferredStyle || "magazine",
    recommendedColorTheme: body.preferredTheme || "slate",
    conclusion: "活動圓滿落幕，展現高度凝聚力與創造成果，奠定未來持續深化合作的堅實基石。",
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const {
      title,
      planContent,
      date,
      location,
      organizer,
      keyMetrics,
      photoCount = 4,
      photos = [],
      preferredStyle,
    } = req.body || {};

    const ai = getAiClient();

    if (ai) {
      try {
        const prompt = `
你是一位具備頂尖編輯與美學素養的高級活動專案總監。
請根據以下提供的活動企劃、背景與執行資料，撰寫一份兼具深度、專業度與視覺傳播效果的繁體中文「活動成果紀實精華」：

【活動基本資料】
活動主題：${title || "未命名精彩活動"}
活動日期：${date || "2026年近期"}
活動地點：${location || "活動指定場地"}
主辦單位：${organizer || "活動籌辦委員會"}
使用者已指定手動輸入之關鍵績效指標：${
          Array.isArray(keyMetrics) && keyMetrics.length > 0
            ? JSON.stringify(keyMetrics)
            : "無指定，請自動計算或提煉"
        }

【活動計畫與說明】
${planContent || "本次活動透過縝密企劃與團隊協作，順利推動各項重要環節並創造豐碩成果。"}

【照片數量】：共 ${photoCount} 張

請輸出專業繁體中文 JSON：
1. headline: 新聞報導風格之大器吸睛主標題（16-28 字）
2. subtitle: 典雅而具提綱挈領效果的副標題（18-35 字）
3. executiveSummary: 活動綜述/成果報告（約 200-350 字，分段流暢，包含活動背景、重要進程與核心價值）
4. keyMetrics: 3-4 項關鍵指標（若使用者有提供指定指標，請原樣保留）。每項含 label 與 value
5. highlights: 3 項核心亮點，每項含 title 與 description
6. photoCaptions: 剛好 ${photoCount} 組具體且符合情境的照片標題與短圖說
7. quotes: 一句具代表性之嘉言、核心標語或首長/來賓致詞金句
8. recommendedLayout: 推薦最合適的排版版面 ('magazine' | 'executive' | 'gallery' | 'chronicle')
9. recommendedColorTheme: 推薦主題配色 ('slate' | 'indigo' | 'forest' | 'terracotta' | 'amber')
10. conclusion: 具前瞻性之結語與展望（50-100 字）
`;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                subtitle: { type: Type.STRING },
                executiveSummary: { type: Type.STRING },
                keyMetrics: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      label: { type: Type.STRING },
                      value: { type: Type.STRING },
                    },
                    required: ["label", "value"],
                  },
                },
                highlights: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                    },
                    required: ["title", "description"],
                  },
                },
                photoCaptions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      caption: { type: Type.STRING },
                    },
                    required: ["title", "caption"],
                  },
                },
                quotes: { type: Type.STRING },
                recommendedLayout: {
                  type: Type.STRING,
                  enum: ["magazine", "executive", "gallery", "chronicle"],
                },
                recommendedColorTheme: {
                  type: Type.STRING,
                  enum: ["slate", "indigo", "forest", "terracotta", "amber"],
                },
                conclusion: { type: Type.STRING },
              },
              required: [
                "headline",
                "subtitle",
                "executiveSummary",
                "keyMetrics",
                "highlights",
                "photoCaptions",
                "quotes",
                "recommendedLayout",
                "recommendedColorTheme",
                "conclusion",
              ],
            },
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text.trim());
          if (Array.isArray(keyMetrics) && keyMetrics.length > 0) {
            parsed.keyMetrics = keyMetrics;
          }
          return res.status(200).json({ success: true, data: parsed, engine: "gemini-ai" });
        }
      } catch (geminiErr: any) {
        console.warn("Gemini analyze warning in Vercel function:", geminiErr?.message);
      }
    }

    const fallbackData = generateSmartFallback(req.body || {});
    return res.status(200).json({ success: true, data: fallbackData, engine: "smart-fallback" });
  } catch (err: any) {
    console.error("Vercel analyze endpoint error:", err);
    const fallbackData = generateSmartFallback(req.body || {});
    return res.status(200).json({ success: true, data: fallbackData, error: err?.message });
  }
}
