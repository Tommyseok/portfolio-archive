import type { ParsedFields, ContentType } from "./types.js";

interface SlideEl {
  objectId?: string;
  link?: { url?: string };
  shape?: { text?: { textElements?: { textRun?: { content?: string } }[] } };
  image?: { contentUrl?: string; imageProperties?: { link?: { url?: string } } };
}
interface Slide {
  objectId?: string;
  pageElements?: SlideEl[];
}

function slideText(slide: Slide): string {
  const blocks: string[] = [];
  for (const el of slide.pageElements ?? []) {
    const t = el.shape?.text?.textElements
      ?.map((te) => te.textRun?.content ?? "")
      .join("");
    if (t) blocks.push(t);
  }
  return blocks.join("\n");
}

export function isProjectSlide(slide: Slide): boolean {
  return /광고주\s*[:：]/.test(slideText(slide));
}

// 라벨 뒤의 같은 줄 텍스트를 추출. `.` 는 줄바꿈을 넘지 않으므로 한 줄만 잡는다.
function field(text: string, label: string): string | null {
  const m = text.match(new RegExp(label + "\\s*[:：]\\s*(.+)"));
  return m ? m[1].trim() : null;
}

function toIsoDate(yymmdd: string): string | null {
  const m = yymmdd.match(/(\d{2})\.(\d{2})\.(\d{2})/);
  return m ? `20${m[1]}-${m[2]}-${m[3]}` : null;
}

function parsePeriod(text: string): { start: string | null; end: string | null } {
  const raw = field(text, "제작 ?기간") ?? "";
  const dates = raw.match(/\d{2}\.\d{2}\.\d{2}/g) ?? [];
  return {
    start: dates[0] ? toIsoDate(dates[0]) : null,
    end: dates[1] ? toIsoDate(dates[1]) : null,
  };
}

function parseBilling(text: string): number | null {
  const raw =
    field(text, "광고주 청구 금액\\(제작비\\)") ?? field(text, "제작비") ?? "";
  // 실제 데이터: "250만원", "1,000만 원", "크레딧 차감 (200만 원 상당)" 등. 만/원 사이 공백 허용.
  const man = raw.match(/([\d,]+)\s*만\s*원/);
  if (man) return parseInt(man[1].replace(/,/g, ""), 10) * 10000;
  const won = raw.match(/([\d,]+)\s*원/);
  if (won) return parseInt(won[1].replace(/,/g, ""), 10);
  return null;
}

function parseContentType(text: string): ContentType[] {
  const set = new Set<ContentType>();
  if (/숏폼|촬영/.test(text)) set.add("촬영숏폼");
  if (/스틸|사진/.test(text)) set.add("스틸사진");
  if (/AI ?영상/.test(text)) set.add("AI영상");
  return [...set];
}

function extractLink(slide: Slide): string | null {
  for (const el of slide.pageElements ?? []) {
    const url = el.link?.url ?? el.image?.imageProperties?.link?.url;
    if (url) return url;
  }
  return null;
}

export function parseSlide(slide: Slide): ParsedFields {
  const text = slideText(slide);
  const { start, end } = parsePeriod(text);
  const piece = field(text, "총 제작 편 수")?.match(/(\d+)/);
  return {
    client: field(text, "광고주") ?? "",
    project_title: field(text, "프로젝트") ?? "",
    overview: field(text, "프로젝트 개요") ?? "",
    period_start: start,
    period_end: end,
    year_month: end ? end.slice(0, 7) : start ? start.slice(0, 7) : null,
    in_house: /외주 ?여부\s*[:：].*내부/.test(text)
      ? true
      : /외주/.test(text)
        ? false
        : null,
    piece_count: piece ? parseInt(piece[1], 10) : null,
    billing_amount: parseBilling(text),
    content_type: parseContentType(text),
    ai_used: /AI ?활용/.test(text),
    video_url: extractLink(slide),
    thumbnail: null,
  };
}
