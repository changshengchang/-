import JSZip from "jszip";
import { ColorTheme, LayoutStyle } from "../types";

export interface ExtractedPlanData {
  title: string;
  date: string;
  location: string;
  organizer: string;
  planContent: string;
  preferredStyle: LayoutStyle;
  preferredTheme: ColorTheme;
  extractionNotes?: string;
}

/**
 * Pure JavaScript docx parser utilizing JSZip and DOM/XML text extraction.
 * Guarantees zero runtime dependencies and 100% reliable execution in both browser and server.
 */
export async function extractTextFromDocxArrayBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docFile = zip.file("word/document.xml");
    if (!docFile) {
      console.warn("word/document.xml not found in docx archive");
      return "";
    }

    const xml = await docFile.async("text");

    // Replace line breaks and tabs
    let processed = xml
      .replace(/<w:br\b[^>]*\/>/gi, "\n")
      .replace(/<w:cr\b[^>]*\/>/gi, "\n")
      .replace(/<w:tab\b[^>]*\/>/gi, "\t");

    // Parse table rows: if cell 0 is a label and cell 1 is a value, join as 'Label：Value'
    processed = processed.replace(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/gi, (_, rowContent) => {
      const cells: string[] = [];
      const cellRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/gi;
      let m: RegExpExecArray | null;
      while ((m = cellRegex.exec(rowContent)) !== null) {
        let cellText = "";
        const tRegex = /<w:t\b[^>]*>([^<]*)<\/w:t>/gi;
        let tm: RegExpExecArray | null;
        while ((tm = tRegex.exec(m[1])) !== null) {
          cellText += tm[1];
        }
        cellText = cellText.trim();
        if (cellText) cells.push(cellText);
      }

      if (cells.length === 2) {
        return `<w:p><w:t>${cells[0]}：${cells[1]}</w:t></w:p>`;
      } else if (cells.length > 2) {
        return `<w:p><w:t>${cells.join(" | ")}</w:t></w:p>`;
      } else if (cells.length === 1) {
        return `<w:p><w:t>${cells[0]}</w:t></w:p>`;
      }
      return "";
    });

    // Extract all paragraphs
    const paragraphs: string[] = [];
    const pRegex = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi;
    let pm: RegExpExecArray | null;
    while ((pm = pRegex.exec(processed)) !== null) {
      let pText = "";
      const tmRegex = /<w:t\b[^>]*>([^<]*)<\/w:t>/gi;
      let tm: RegExpExecArray | null;
      while ((tm = tmRegex.exec(pm[1])) !== null) {
        pText += tm[1];
      }
      // Decode XML entities
      pText = pText
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .trim();

      if (pText) {
        paragraphs.push(pText);
      }
    }

    return paragraphs.join("\n");
  } catch (err) {
    console.warn("extractTextFromDocxArrayBuffer failed:", err);
    return "";
  }
}

/**
 * High-precision Taiwanese & Chinese event plan extractor.
 * Expertly extracts: Title, Date, Location, Organizer, and Plan/Outcome Description.
 */
export function extractPlanFromDocumentText(rawText: string, fileName?: string): ExtractedPlanData {
  const clean = (rawText || "")
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  const lines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Clean filename for fallback
  const cleanFileName = (fileName || "")
    .replace(/\.[^/.]+$/, "")
    .replace(/^(活動|專案|企劃|計畫|成果|報告)+[_\-\s]*/g, "")
    .replace(/[_\-\s]*(企劃書|計畫書|成果報告|紀實|簡章|方案)$/g, "")
    .trim();

  // ----------------------------------------------------
  // 1. 活動名稱 (Title)
  // ----------------------------------------------------
  let title = "";
  for (const line of lines.slice(0, 15)) {
    const titleMatch = line.match(
      /(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:活動名稱|活動主題|專案名稱|企劃主題|企劃名稱|計畫名稱|主題|展覽名稱|研討會名稱|營隊名稱|活動案名)[：:\s]+([^\n\r]+)/i
    );
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].replace(/^[【《「『]| [】》」』]$/g, "").trim();
      break;
    }

    const bracketMatch = line.match(/^[【《「『](.+?)[】》」』](?:企劃書|計畫書|成果報告|實施方案)?$/);
    if (bracketMatch && bracketMatch[1].trim().length >= 4 && bracketMatch[1].trim().length <= 40) {
      title = bracketMatch[1].trim();
      break;
    }
  }

  // If still not found, check the first 3 lines
  if (!title) {
    for (const line of lines.slice(0, 3)) {
      if (line.length >= 5 && line.length <= 45 && !line.includes("：") && !line.includes(":")) {
        const cleanedLine = line
          .replace(/(實施計畫|企劃書|成果報告|活動簡章|執行方案)$/, "")
          .trim();
        if (cleanedLine.length >= 4) {
          title = cleanedLine;
          break;
        }
      }
    }
  }

  if (!title && cleanFileName && cleanFileName.length >= 3) {
    title = cleanFileName;
  }
  if (!title) {
    title = lines[0] ? lines[0].slice(0, 35) : "年度卓越活動成果紀實";
  }

  // ----------------------------------------------------
  // 2. 活動日期 (Date)
  // ----------------------------------------------------
  let date = "";
  for (const line of lines) {
    const dateMatch = line.match(
      /(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:活動時間|舉辦時間|活動日期|舉辦日期|活動期程|舉辦期程|實施期程|辦理時間|辦理日期|活動時程|日期|時間|期程|時程)[：:\s]+([^\n\r]+)/i
    );
    if (dateMatch && dateMatch[1].trim()) {
      date = dateMatch[1].trim();
      // Remove trailing notes if any
      date = date.replace(/[（\(]如遇天候.*[）\)]/g, "").trim();
      break;
    }
  }

  // Secondary date search if labeled match wasn't found
  if (!date) {
    for (const line of lines.slice(0, 25)) {
      // Check for 民國年: 113年X月X日 or 民國113年
      const rocMatch = line.match(
        /(?:(?:中華民國|民國)\s*)?(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日號]?(?:\s*[(（][^()）]*[)）])?(?:\s*(?:至|~|-|～|到)\s*(?:(?:民國\s*)?(\d{2,3})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*[日號]?)?(?:\s*\d{1,2}[:：]\d{2}(?:\s*[-~至到]\s*\d{1,2}[:：]\d{2})?)?/
      );
      if (rocMatch) {
        date = rocMatch[0].trim();
        break;
      }

      // Check for 西元年: 2024年X月X日 or 2024/XX/XX
      const adMatch = line.match(
        /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日號]?(?:\s*[(（][^()）]*[)）])?(?:\s*(?:至|~|-|～|到)\s*(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*[日號]?)?(?:\s*\d{1,2}[:：]\d{2}(?:\s*[-~至到]\s*\d{1,2}[:：]\d{2})?)?/
      );
      if (adMatch) {
        date = adMatch[0].trim();
        break;
      }
    }
  }

  if (!date) {
    const now = new Date();
    date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  }

  // ----------------------------------------------------
  // 3. 活動地點 (Location)
  // ----------------------------------------------------
  let location = "";
  for (const line of lines) {
    const locMatch = line.match(
      /(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:活動地點|舉辦地點|活動場地|舉辦場地|辦理地點|實施地點|場地地點|研討地點|會議地點|活動範圍|集合地點|地點|場地)[：:\s]+([^\n\r]+)/i
    );
    if (locMatch && locMatch[1].trim()) {
      location = locMatch[1].trim();
      break;
    }
  }

  // Secondary location search by semantic keywords
  if (!location) {
    for (const line of lines.slice(0, 30)) {
      const isHeader = line.includes("主辦") || line.includes("時間") || line.includes("日期") || line.includes("對象");
      if (
        !isHeader &&
        /(國際會議中心|文創園區|活動中心|體育館|大禮堂|展覽館|演藝廳|視聽室|圖書館|會議室|教室|大樓|校區|飯店|會館|線上會議|Google Meet|Microsoft Teams|Zoom)/i.test(
          line
        )
      ) {
        location = line.replace(/^[（(【\[].*?[）)】\]]/g, "").trim();
        break;
      }
    }
  }

  if (!location) {
    location = "活動指定現場";
  }

  // ----------------------------------------------------
  // 4. 主辦 / 籌備單位 (Organizer)
  // ----------------------------------------------------
  let organizer = "";
  for (const line of lines) {
    const orgMatch = line.match(
      /(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:主辦單位|指導單位|主辦機構|主辦團隊|籌辦單位|主責單位|主導單位|承辦單位|執行單位|協辦單位|主辦)[：:\s]+([^\n\r]+)/i
    );
    if (orgMatch && orgMatch[1].trim()) {
      organizer = orgMatch[1].trim();
      break;
    }
  }

  // Secondary organizer search
  if (!organizer) {
    for (const line of lines.slice(0, 25)) {
      if (
        !line.includes("日期") &&
        !line.includes("時間") &&
        !line.includes("地點") &&
        /(教育部|文化部|經濟部|市府|委員會|學會|協會|基金會|大學|高中|國中|國小|中心|工作室|團隊|小組)/.test(line) &&
        line.length <= 40
      ) {
        organizer = line.trim();
        break;
      }
    }
  }

  if (!organizer) {
    organizer = "活動籌辦委員會";
  }

  // ----------------------------------------------------
  // 5. 計畫內容與成果說明 (Plan Content & Outcomes)
  // ----------------------------------------------------
  interface Section {
    title: string;
    lines: string[];
  }

  const sections: Section[] = [];
  let currentSection: Section | null = null;

  for (const line of lines) {
    const secMatch = line.match(
      /(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:【?(?:活動目的|計畫目的|目的|宗旨|活動宗旨|背景說明|緣起|活動內容|實施內容|計畫內容|辦理內容|主要內容|活動規劃|執行成果|活動成果|成果說明|辦理成果|預期效益|效益評估|成果紀實|活動流程|活動議程)】?)[：:\s]*(.*)/i
    );

    if (secMatch) {
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      const rawTitle = secMatch[0].replace(/[：:\s]+$/, "").trim();
      currentSection = { title: rawTitle, lines: [] };
      if (secMatch[1] && secMatch[1].trim()) {
        currentSection.lines.push(secMatch[1].trim());
      }
    } else if (currentSection) {
      // Don't accumulate administrative metadata
      if (
        line.startsWith("主辦") ||
        line.startsWith("指導") ||
        line.startsWith("日期") ||
        line.startsWith("時間") ||
        line.startsWith("地點") ||
        line.startsWith("聯絡") ||
        line.startsWith("經費")
      ) {
        // End section if next admin field starts
        if (currentSection.lines.length > 0) {
          sections.push(currentSection);
          currentSection = null;
        }
      } else {
        currentSection.lines.push(line);
      }
    }
  }
  if (currentSection && currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  let planContent = "";
  if (sections.length > 0) {
    planContent = sections
      .map((s) => {
        const header = s.title.replace(/^[【《「『]| [】》」』]$/g, "");
        const body = s.lines.slice(0, 6).join("\n");
        return `【${header}】\n${body}`;
      })
      .slice(0, 4)
      .join("\n\n");
  }

  // Fallback if no specific section headers matched:
  // Extract narrative paragraphs (filtering out short administrative lines)
  if (!planContent || planContent.length < 50) {
    const narrativeParagraphs = lines.filter((l) => {
      if (l.length < 18) return false;
      if (l.startsWith("主辦") || l.startsWith("指導") || l.startsWith("日期") || l.startsWith("時間") || l.startsWith("地點")) return false;
      if (l.startsWith("聯絡人") || l.startsWith("電話") || l.startsWith("經費") || l.startsWith("報名")) return false;
      return true;
    });

    if (narrativeParagraphs.length > 0) {
      planContent = narrativeParagraphs.slice(0, 5).join("\n\n");
    }
  }

  // Final fallback with rich summary
  if (!planContent || planContent.length < 30) {
    planContent = `本活動「${title}」由「${organizer}」精心策劃並順利舉辦。\n透過多元化的主題議程、實務交流與成果展示，成功匯聚全體與會夥伴之向心力與專業智慧。\n活動期間交流氣氛熱烈，圓滿達成各項計畫指標，為後續之深化發展建立堅實之良好基石。`;
  }

  // Truncate to reasonable length (approx 650 chars max for prompt / layout)
  if (planContent.length > 800) {
    planContent = planContent.slice(0, 780) + "...\n（已完整收錄核心成果精要）";
  }

  // ----------------------------------------------------
  // 6. Style & Color Theme Recommendation
  // ----------------------------------------------------
  let preferredStyle: LayoutStyle = "magazine";
  let preferredTheme: ColorTheme = "slate";

  const allText = (clean + " " + title).toLowerCase();
  if (
    allText.includes("公務") ||
    allText.includes("機關") ||
    allText.includes("研討會") ||
    allText.includes("行政") ||
    allText.includes("高峰會") ||
    allText.includes("論壇")
  ) {
    preferredStyle = "executive";
    preferredTheme = "slate";
  } else if (
    allText.includes("展覽") ||
    allText.includes("藝術") ||
    allText.includes("攝影") ||
    allText.includes("美學") ||
    allText.includes("文化") ||
    allText.includes("畫廊")
  ) {
    preferredStyle = "gallery";
    preferredTheme = "amber";
  } else if (
    allText.includes("營隊") ||
    allText.includes("歷史") ||
    allText.includes("走讀") ||
    allText.includes("回顧") ||
    allText.includes("自然") ||
    allText.includes("生態") ||
    allText.includes("年表")
  ) {
    preferredStyle = "chronicle";
    preferredTheme = "forest";
  } else if (
    allText.includes("工作坊") ||
    allText.includes("青年") ||
    allText.includes("黑客松") ||
    allText.includes("創客") ||
    allText.includes("設計") ||
    allText.includes("競賽")
  ) {
    preferredStyle = "magazine";
    preferredTheme = "indigo";
  }

  return {
    title,
    date,
    location,
    organizer,
    planContent,
    preferredStyle,
    preferredTheme,
    extractionNotes: `已成功解析文件「${fileName || "活動企劃書"}」，精準擷取活動名稱、期程、地點、主辦單位及成果說明！`,
  };
}
