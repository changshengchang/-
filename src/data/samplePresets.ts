import { EventPlanInput, UploadedPhoto } from "../types";

export interface PresetData {
  id: string;
  name: string;
  category: string;
  plan: EventPlanInput;
  photos: UploadedPhoto[];
}

export const SAMPLE_PRESETS: PresetData[] = [
  {
    id: "tech-hackathon",
    name: "2026 數位創新黑客松與成果發表會",
    category: "科技創新 / 企業團隊",
    plan: {
      title: "2026 跨界數位創新黑客松成果發表會",
      date: "2026年8月15日 - 8月16日",
      location: "台北國際會議中心 3F 數位展演廳",
      organizer: "未來創新技術實驗室 & 數位賦能發展處",
      planContent: `【活動主旨】
激發跨部門同仁在 AI 應用、智慧工作流程及綠色永續科技上的創新潛能，透過 36 小時不間斷黑客松競賽，實際孵化落地解決方案。

【活動重點階段與時程】
1. 開幕式與前瞻趨勢演講：邀請三位業界技術專家分享 Generative AI 最新落地實踐。
2. 跨界分組腦力激盪：共 12 組隊伍跨越產品、設計、工程與營運部門自由組隊。
3. 導師指引與原型實作：歷經深夜攻堅，產出具備可運行之 Prototype 與商業計畫書。
4. 成果展示與評審頒獎：各組進行 5 分鐘 Demo Pitch，最終評選出最佳創新獎與最具市場價值獎。

【預期與達成效益】
全體參與者滿意度達 98%，孵化出 4 項已列入次季產品 Roadmap 的核心創新專利雛型，極大促進跨部門默契。`,
      preferredStyle: "magazine",
      preferredTheme: "indigo",
      keyMetrics: [
        { label: "參與者滿意度", value: "98.5%" },
        { label: "產出原型專案", value: "12 組" },
        { label: "落地專利雛型", value: "4 項" },
        { label: "極限攻堅時數", value: "36 h" },
      ],
    },
    photos: [
      {
        id: "p1",
        name: "summit_keynote.jpg",
        dataUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1000&auto=format&fit=crop&q=80",
        captionTitle: "主題演講開場",
        captionText: "特邀產學權威專家剖析全球智慧科技前瞻趨勢，全場座無虛席。",
        isCover: true,
      },
      {
        id: "p2",
        name: "team_brainstorming.jpg",
        dataUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
        captionTitle: "跨界協作激盪",
        captionText: "各組隊員密集討論專案架構與使用者旅程，白板寫滿創新思路。",
        isCover: false,
      },
      {
        id: "p3",
        name: "coding_sprint.jpg",
        dataUrl: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80",
        captionTitle: "深夜衝刺實作",
        captionText: "工程與設計夥伴並肩作戰，將創新想法轉化為流暢可用的數位雛型。",
        isCover: false,
      },
      {
        id: "p4",
        name: "award_celebration.jpg",
        dataUrl: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80",
        captionTitle: "榮耀頒獎時刻",
        captionText: "優勝團隊登台受獎並分享研發心路歷程，全場報以熱烈掌聲。",
        isCover: false,
      },
      {
        id: "p5",
        name: "group_photo.jpg",
        dataUrl: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80",
        captionTitle: "全體夥伴大合照",
        captionText: "全體參賽選手、評審與工作人員留下珍貴大合影，共慶圓滿成功。",
        isCover: false,
      },
    ],
  },
  {
    id: "eco-nature",
    name: "陽明山自然生態親子探索日",
    category: "戶外活動 / 社區公益",
    plan: {
      title: "陽明山森呼吸・親子自然生態觀察日",
      date: "2026年7月20日",
      location: "陽明山國家公園 二子坪步道與遊客中心",
      organizer: "綠野尋蹤自然保育協會",
      planContent: `【活動宗旨】
帶領都市家庭走入大自然，透過五感體驗認識台灣低海拔森林生態，培養下一代珍惜自然資源與無痕山林（LNT）的友善觀念。

【執行內容】
1. 步道植物與昆蟲尋寶：專業解說員引導親子辨識蕨類與多樣昆蟲生態。
2. 天然植物拓印手作體驗：採集落葉落花，創作專屬於家庭的手工帆布袋。
3. 綠色野餐交流時光：推廣減塑自備餐具，享用在地健康輕食餐點。
4. 環境保育共學心得分享：孩童分享今日觀察心得，頒發「小小森林守護者」榮譽徽章。`,
      preferredStyle: "gallery",
      preferredTheme: "forest",
      keyMetrics: [
        { label: "親子參與家庭", value: "45 組" },
        { label: "活動滿意度", value: "99.2%" },
        { label: "微距觀察物種", value: "38 種" },
        { label: "活動減塑減碳量", value: "15 kg" },
      ],
    },
    photos: [
      {
        id: "e1",
        name: "forest_trail.jpg",
        dataUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=1000&auto=format&fit=crop&q=80",
        captionTitle: "漫步森林綠意",
        captionText: "晨曦灑落林間步道，親子隊伍在芬多精中展開探索旅程。",
        isCover: true,
      },
      {
        id: "e2",
        name: "kids_nature.jpg",
        dataUrl: "https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&auto=format&fit=crop&q=80",
        captionTitle: "微距生態觀察",
        captionText: "孩子們拿著放大鏡專注觀察樹皮上的蘚苔與小昆蟲蹤影。",
        isCover: false,
      },
      {
        id: "e3",
        name: "leaf_craft.jpg",
        dataUrl: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=800&auto=format&fit=crop&q=80",
        captionTitle: "自然手作手袋",
        captionText: "運用落葉拓印獨一無二的紋理，在笑聲中體會大自然之美。",
        isCover: false,
      },
      {
        id: "e4",
        name: "family_picnic.jpg",
        dataUrl: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&auto=format&fit=crop&q=80",
        captionTitle: "草地共食野餐",
        captionText: "自備環保餐具的減塑野餐，彼此交流育兒與戶外經驗。",
        isCover: false,
      },
    ],
  },
  {
    id: "product-launch",
    name: "秋季高端設計美學品味發表會",
    category: "商業發布 / 精品品牌",
    plan: {
      title: "「光影沉思」2026 典藏生活美學新品發表會",
      date: "2026年9月1日",
      location: "松山文創園區 1號倉庫藝文空間",
      organizer: "AURA Living 傢飾生活集團",
      planContent: `【品牌理念】
以極簡工藝結合有機天然材質，發表本年度全系列傢飾新品，傳遞「減法生活，留白至美」的空間哲學。

【活動亮點規劃】
1. 光影沉浸式展場動線：透過點燈儀式與氛圍音樂營造極具張力的感官體驗。
2. 首席設計師理念對談：解讀每一件材質選用背後的匠人技藝與永續承諾。
3. VIP 貴賓沉浸鑑賞與酒會：邀約逾 100 位生活美學家、建築師與媒體總編親臨交流。`,
      preferredStyle: "executive",
      preferredTheme: "terracotta",
      keyMetrics: [
        { label: "VIP貴賓出席率", value: "96.4%" },
        { label: "展出原創設計", value: "24 件" },
        { label: "媒體與意向簽約", value: "18 筆" },
        { label: "品牌聲量成長", value: "+320%" },
      ],
    },
    photos: [
      {
        id: "d1",
        name: "exhibition_hall.jpg",
        dataUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1000&auto=format&fit=crop&q=80",
        captionTitle: "簡約沉浸展場",
        captionText: "純粹的留白與自然光感，完美襯托出系列工藝品的典雅質感。",
        isCover: true,
      },
      {
        id: "d2",
        name: "designer_talk.jpg",
        dataUrl: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80",
        captionTitle: "設計哲學對談",
        captionText: "主創設計師娓娓道來從草圖到實物的匠心打磨旅程。",
        isCover: false,
      },
      {
        id: "d3",
        name: "detail_showcase.jpg",
        dataUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80",
        captionTitle: "材質與細節特寫",
        captionText: "嚴選胡桃木與陶土溫潤質地，展現歷久彌新的生活品味。",
        isCover: false,
      },
      {
        id: "d4",
        name: "cocktail_networking.jpg",
        dataUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&auto=format&fit=crop&q=80",
        captionTitle: "雅聚品酩交流",
        captionText: "貴賓與媒體暢談空間美學趨勢，為新品發布譜下輝煌序幕。",
        isCover: false,
      },
    ],
  },
];
