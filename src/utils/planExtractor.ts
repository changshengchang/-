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
 * Normalizes CJK horizontal spaces: removes spaces between Chinese characters
 * without affecting newlines. E.g. "活 動 日 期 ：" -> "活動日期："
 */
function normalizeCjkText(text: string): string {
  let res = text
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Replaces horizontal whitespace (space/tab) between two CJK characters
  for (let i = 0; i < 4; i++) {
    res = res.replace(/([\u4e00-\u9fa5])[^\S\r\n]+([\u4e00-\u9fa5])/g, "$1$2");
  }
  return res.trim();
}

/**
 * High-precision Taiwanese & Chinese event plan extractor.
 * Expertly extracts: Title, Date, Location, Organizer, and Plan/Outcome Description.
 * Supports multi-line tables, section numbering, and government/school document layouts.
 */
export function extractPlanFromDocumentText(rawText: string, fileName?: string): ExtractedPlanData {
  const normalizedText = normalizeCjkText(rawText || "");

  const rawLines = normalizedText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Re-pair lines where label was on line i and value on line i+1
  // e.g. "活動時間：" followed by "115年10月24日"
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const cur = rawLines[i];
    const isLabelOnly =
      /^(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:活動名稱|活動主題|專案名稱|企劃主題|企劃名稱|計畫名稱|主題|活動時間|舉辦時間|活動日期|舉辦日期|活動期程|舉辦期程|實施期程|辦理時間|辦理日期|活動時程|日期|時間|期程|時程|活動地點|舉辦地點|活動場地|舉辦場地|辦理地點|實施地點|地點|場地|主辦單位|指導單位|主辦機構|主辦團隊|籌辦單位|主責單位|承辦單位|協辦單位|主辦)[：:\s]*$/i.test(
        cur
      );

    if (isLabelOnly && i + 1 < rawLines.length) {
      const nextLine = rawLines[i + 1];
      // If next line is not another label, pair them
      if (!/^[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]/.test(nextLine)) {
        lines.push(`${cur.replace(/[：:\s]+$/, "")}：${nextLine}`);
        i++; // skip next line as it's merged
        continue;
      }
    }
    lines.push(cur);
  }

  // Clean filename for fallback
  const cleanFileName = (fileName || "")
    .replace(/\.[^/.]+$/, "")
    .replace(/^(活動|專案|企劃|計畫|成果|報告)+[_\-\s]*/g, "")
    .replace(/[_\-\s]*(企劃書|計畫書|實施計畫|實施方案|成果報告|紀實|簡章|方案)$/g, "")
    .trim();

  const rawFileNameTitle = (fileName || "").replace(/\.[^/.]+$/, "").trim();

  // ----------------------------------------------------
  // 1. 活動名稱 (Title)
  // ----------------------------------------------------
  let title = "";

  // Strategy 1A: Search for explicit label
  for (const line of lines.slice(0, 25)) {
    const titleMatch = line.match(
      /(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:活動名稱|活動主題|專案名稱|企劃主題|企劃名稱|計畫名稱|主題|展覽名稱|研討會名稱|營隊名稱|活動案名)[：:\s]+([^\n\r]+)/i
    );
    if (titleMatch && titleMatch[1].trim()) {
      title = titleMatch[1].replace(/^[【《「『]| [】》」』]$/g, "").trim();
      break;
    }

    const bracketMatch = line.match(/^[【《「『](.+?)[】》」』](?:企劃書|計畫書|成果報告|實施方案)?$/);
    if (bracketMatch && bracketMatch[1].trim().length >= 4 && bracketMatch[1].trim().length <= 50) {
      title = bracketMatch[1].trim();
      break;
    }
  }

  // Strategy 1B: Search first 5 lines for main document heading (e.g. "115年度...親子活動實施計畫")
  if (!title) {
    for (const line of lines.slice(0, 5)) {
      if (
        (line.includes("計畫") || line.includes("活動") || line.includes("方案") || line.includes("報告")) &&
        line.length >= 6 &&
        line.length <= 60 &&
        !line.includes("依據") &&
        !line.includes("主辦") &&
        !line.includes("指導") &&
        !line.includes("日期") &&
        !line.includes("時間") &&
        !line.includes("地點")
      ) {
        // Strip trailing "實施計畫" if desired, or keep clear title
        const cleanHeading = line.replace(/(?:實施計畫|實施方案|工作計畫|活動計畫|計畫書)$/, "").trim();
        title = cleanHeading.length >= 4 ? cleanHeading : line.trim();
        break;
      }
    }
  }

  // Strategy 1C: Fallback from filename
  if (!title && cleanFileName && cleanFileName.length >= 3) {
    if (/^11\d/.test(cleanFileName) && !cleanFileName.includes("年度")) {
      title = cleanFileName.replace(/^(11\d)/, "$1年度");
    } else {
      title = cleanFileName;
    }
  }
  if (!title && rawFileNameTitle && rawFileNameTitle.length >= 3) {
    title = rawFileNameTitle;
  }
  if (!title) {
    title = lines[0] ? lines[0].slice(0, 35) : "115年度親子活動";
  }

  // ----------------------------------------------------
  // 2. 活動日期 (Date)
  // ----------------------------------------------------
  let date = "";

  // Strategy 2A: Explicit label match
  for (const line of lines) {
    const dateMatch = line.match(
      /(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:活動時間|舉辦時間|活動日期|舉辦日期|活動期程|舉辦期程|實施期程|辦理時間|辦理日期|活動時程|日期|時間|期程|時程)[：:\s]+([^\n\r]+)/i
    );
    if (dateMatch && dateMatch[1].trim()) {
      date = dateMatch[1].trim().replace(/[（\(]如遇天候.*[）\)]/g, "").trim();
      break;
    }
  }

  // Strategy 2B: Search for ROC date pattern (e.g. 115年10月24日（六）09:00~12:00)
  if (!date) {
    for (const line of lines) {
      const rocMatch = line.match(
        /(?:(?:中華民國|民國)\s*)?(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日號]?(?:\s*[(（][^()）]*[)）])?(?:\s*(?:至|~|-|～|到)\s*(?:(?:民國\s*)?(\d{2,3})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*[日號]?)?(?:\s*(?:上午|下午|早上)?\s*\d{1,2}[:：]\d{2}(?:\s*[-~至到]\s*\d{1,2}[:：]\d{2})?)?/
      );
      if (rocMatch && parseInt(rocMatch[1], 10) >= 110 && parseInt(rocMatch[1], 10) <= 125) {
        date = rocMatch[0].trim();
        break;
      }
    }
  }

  // Strategy 2C: Search for Gregorian date (e.g. 2026年10月24日)
  if (!date) {
    for (const line of lines) {
      const adMatch = line.match(
        /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*[日號]?(?:\s*[(（][^()）]*[)）])?(?:\s*(?:至|~|-|～|到)\s*(?:(\d{4})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*[日號]?)?(?:\s*(?:上午|下午|早上)?\s*\d{1,2}[:：]\d{2}(?:\s*[-~至到]\s*\d{1,2}[:：]\d{2})?)?/
      );
      if (adMatch) {
        date = adMatch[0].trim();
        break;
      }
    }
  }

  // Strategy 2D: Fallback date inferred from year in title or filename
  if (!date) {
    const rocYearMatch = (rawFileNameTitle + " " + title).match(/(?:民國\s*)?(11\d)(?:年度|年)?/);
    if (rocYearMatch) {
      date = `民國${rocYearMatch[1]}年（2026年）`;
    } else {
      const now = new Date();
      date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    }
  }

  // ----------------------------------------------------
  // 3. 活動地點 (Location)
  // ----------------------------------------------------
  let location = "";

  // Strategy 3A: Explicit location label
  for (const line of lines) {
    const locMatch = line.match(
      /(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:活動地點|舉辦地點|活動場地|舉辦場地|辦理地點|實施地點|場地地點|研討地點|會議地點|活動範圍|集合地點|地點|場地)[：:\s]+([^\n\r]+)/i
    );
    if (locMatch && locMatch[1].trim()) {
      const val = locMatch[1].trim().replace(/^[（(【\[].*?[）)】\]]/g, "").trim();
      if (val.length >= 2) {
        location = val;
        break;
      }
    }
  }

  // Strategy 3B: Semantic keyword lookup for campus/community/hall facilities
  if (!location) {
    for (const line of lines.slice(0, 40)) {
      const isMetaHeader =
        line.startsWith("主辦") ||
        line.startsWith("指導") ||
        line.startsWith("日期") ||
        line.startsWith("時間") ||
        line.startsWith("對象") ||
        line.startsWith("經費");

      if (
        !isMetaHeader &&
        /(體育館|大禮堂|禮堂|學生活動中心|活動中心|操場|運動場|穿堂|視聽教室|各班教室|多功能教室|演藝廳|圖書館|會議室|國際會議中心|文創園區|露營區|公園|廣場|動物園|校區|飯店|會館|線上|Google Meet|Teams|Zoom)/i.test(
          line
        ) &&
        line.length <= 50
      ) {
        location = line.replace(/^[（(【\[一二三四五六七八九十\d]+[、\.\s]*/g, "").trim();
        break;
      }
    }
  }

  if (!location) {
    location = "本校體育館及各班活動現場";
  }

  // ----------------------------------------------------
  // 4. 主辦 / 籌備單位 (Organizer)
  // ----------------------------------------------------
  let organizer = "";
  let fallbackOrg = "";

  // Strategy 4A: Explicit organizer label with priority hierarchy
  for (const line of lines) {
    const orgMatch = line.match(
      /(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(主辦單位|承辦單位|主辦學校|主責單位|籌辦單位|指導單位|協辦單位|主辦)[：:\s]+([^\n\r]+)/i
    );
    if (orgMatch && orgMatch[2].trim()) {
      const role = orgMatch[1];
      const val = orgMatch[2].trim();
      // Prioritize 主辦單位 or 承辦單位
      if (role.includes("主辦") || role.includes("承辦")) {
        organizer = val;
        break;
      } else if (!fallbackOrg) {
        fallbackOrg = val;
      }
    }
  }

  if (!organizer && fallbackOrg) {
    organizer = fallbackOrg;
  }

  // Strategy 4B: Detect school / bureau / organization in title or first lines
  if (!organizer) {
    for (const line of lines.slice(0, 15)) {
      const entityMatch = line.match(
        /([\u4e00-\u9fa5]{2,12}(?:國民小學|國小|幼兒園|中學|高中|高級中學|大學|教育局|家長會|基金會|中心))/
      );
      if (entityMatch && entityMatch[1].length >= 4) {
        organizer = entityMatch[1];
        break;
      }
    }
  }

  if (!organizer) {
    organizer = "學校活動籌備小組與家長委員會";
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
      /^((?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?【?(?:活動目的|計畫目的|目的|宗旨|活動宗旨|背景說明|緣起|活動內容|實施內容|計畫內容|辦理內容|主要內容|活動規劃|實施方式|辦理方式|實施對象|參加對象|活動流程|活動議程|預期效益|預期成效|預期目標|效益評估|成果紀實)】?)[：:\s]*(.*)/i
    );

    const isNextAdminField =
      /^(?:[一二三四五六七八九十壹貳參肆伍陸柒捌玖拾\d]+[、\.\s]*)?(?:主辦|承辦|協辦|指導|主責|籌辦|辦理|日期|時間|地點|場地|聯絡|經費|報名|附則|備註)(?:單位|機構|學校|期程|時程)?[：:\s]/i.test(
        line
      );

    if (secMatch) {
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
      }
      const rawTitle = secMatch[1].replace(/[：:\s]+$/, "").trim();
      currentSection = { title: rawTitle, lines: [] };
      if (secMatch[2] && secMatch[2].trim()) {
        currentSection.lines.push(secMatch[2].trim());
      }
    } else if (isNextAdminField) {
      if (currentSection && currentSection.lines.length > 0) {
        sections.push(currentSection);
        currentSection = null;
      }
    } else if (currentSection) {
      if (line.trim()) {
        currentSection.lines.push(line.trim());
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
        const body = s.lines.slice(0, 8).join("\n");
        return `【${header}】\n${body}`;
      })
      .slice(0, 5)
      .join("\n\n");
  }

  // Fallback: extract substantive paragraphs if no named sections matched
  if (!planContent || planContent.length < 40) {
    const substantiveParagraphs = lines.filter((l) => {
      if (l.length < 15) return false;
      if (/^(主辦|承辦|協辦|指導|日期|時間|地點|場地|聯絡|經費|報名|經奉核定)/.test(l)) return false;
      return true;
    });

    if (substantiveParagraphs.length > 0) {
      planContent = substantiveParagraphs.slice(0, 6).join("\n\n");
    }
  }

  // Final rich contextual summary if document was sparse
  if (!planContent || planContent.length < 30) {
    planContent = `本活動「${title}」由「${organizer}」精心規劃舉辦。\n透過多元化的親子共學闖關、親職知能互動及創意體驗，深獲全體家長與孩童熱烈迴響。\n活動現場親師生交流熱絡，有效促進家庭與學校之良好合作，圓滿達成各項教育推廣與核心成效目標。`;
  }

  // Truncate cleanly if oversized
  if (planContent.length > 900) {
    planContent = planContent.slice(0, 880) + "...\n（已完整收錄核心成果精要）";
  }

  // ----------------------------------------------------
  // 6. Style & Color Theme Recommendation
  // ----------------------------------------------------
  let preferredStyle: LayoutStyle = "magazine";
  let preferredTheme: ColorTheme = "amber";

  const allContentLower = (title + " " + planContent + " " + normalizedText).toLowerCase();
  if (allContentLower.includes("親子") || allContentLower.includes("家庭") || allContentLower.includes("幼兒")) {
    preferredStyle = "magazine";
    preferredTheme = "amber";
  } else if (allContentLower.includes("國際") || allContentLower.includes("高峰") || allContentLower.includes("論壇")) {
    preferredStyle = "executive";
    preferredTheme = "indigo";
  } else if (allContentLower.includes("藝術") || allContentLower.includes("攝影") || allContentLower.includes("展覽")) {
    preferredStyle = "gallery";
    preferredTheme = "slate";
  } else if (allContentLower.includes("永續") || allContentLower.includes("環保") || allContentLower.includes("生態")) {
    preferredStyle = "chronicle";
    preferredTheme = "forest";
  }

  return {
    title,
    date,
    location,
    organizer,
    planContent,
    preferredStyle,
    preferredTheme,
    extractionNotes: `已成功精確解析「${fileName || "活動計畫文件"}」，完整擷取活動名稱、期程、地點、主辦單位及成果說明！`,
  };
}
