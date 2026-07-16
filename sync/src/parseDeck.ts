// sync/src/parseDeck.ts
// DS·MS 덱 파서 (순수 함수). 두 덱 모두 슬라이드 안의 메타데이터 표(table)가 진실원천:
//   DS: DATE / CLIENT / TEAM / TOOL / USE
//   MS: 제작일자 / 광고주 / 특이사항  (+ 이미지마다 드롭박스 영상 링크)
// 표가 없는 슬라이드(표지·고지·월 구분·원본 참고)는 아이템이 아니다.

interface TextEl { textRun?: { content?: string } }
interface SlideEl {
  objectId?: string;
  link?: { url?: string };
  shape?: { text?: { textElements?: TextEl[] } };
  image?: { contentUrl?: string; imageProperties?: { link?: { url?: string } } };
  table?: { tableRows?: { tableCells?: { text?: { textElements?: TextEl[] } }[] }[] };
}
export interface Slide { objectId?: string; pageElements?: SlideEl[] }

function cellText(cell: { text?: { textElements?: TextEl[] } }): string {
  return (cell.text?.textElements ?? []).map((te) => te.textRun?.content ?? "").join("").trim();
}

/** 슬라이드의 모든 표를 "첫 셀=키, 나머지=값" 으로 평탄화. */
export function tableKV(slide: Slide): Record<string, string> {
  const kv: Record<string, string> = {};
  for (const el of slide.pageElements ?? []) {
    for (const row of el.table?.tableRows ?? []) {
      const cells = (row.tableCells ?? []).map(cellText);
      if (cells.length >= 2 && cells[0]) kv[cells[0]] = cells.slice(1).filter(Boolean).join(" ").trim();
    }
  }
  return kv;
}

/** "2026년 6월" / "26년 6월" / "2026.06" → "2026-06" */
export function parseKoreanMonth(raw: string | undefined): string | null {
  if (!raw) return null;
  let m = raw.match(/(\d{4})\s*년\s*(\d{1,2})\s*월/);
  if (!m) m = raw.match(/(\d{2})\s*년\s*(\d{1,2})\s*월/);
  if (!m) m = raw.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})/);
  if (!m) return null;
  const year = m[1].length === 2 ? `20${m[1]}` : m[1];
  return `${year}-${m[2].padStart(2, "0")}`;
}

/** 슬라이드 내 모든 링크 URL (요소 link + 이미지 속성 link). */
export function slideLinks(slide: Slide): string[] {
  const urls: string[] = [];
  for (const el of slide.pageElements ?? []) {
    const u = el.link?.url ?? el.image?.imageProperties?.link?.url;
    if (u) urls.push(u);
  }
  return [...new Set(urls)];
}

/** 슬라이드 안 크리에이티브 이미지 요소들 (contentUrl 은 30분 만료 — 즉시 다운로드 필요) */
export interface SlideImage { element_id: string; url: string }

export function slideImages(slide: Slide): SlideImage[] {
  const out: SlideImage[] = [];
  for (const el of slide.pageElements ?? []) {
    if (el.image?.contentUrl && el.objectId) out.push({ element_id: el.objectId, url: el.image.contentUrl });
  }
  return out;
}

export interface DsParsed {
  source_slide_id: string;
  client_raw: string;
  year_month: string | null;
  team: string | null;
  tools: string[];
  use: string;
  images: SlideImage[];
}

export function parseDsSlides(slides: Slide[]): DsParsed[] {
  const out: DsParsed[] = [];
  for (const s of slides) {
    const kv = tableKV(s);
    const client = kv["CLIENT"];
    if (!client) continue; // 메타 표 없는 슬라이드는 아이템 아님
    out.push({
      source_slide_id: s.objectId ?? "",
      client_raw: client,
      year_month: parseKoreanMonth(kv["DATE"]),
      team: kv["TEAM"] || null,
      tools: (kv["TOOL"] ?? "").split(/[,+/·]/).map((t) => t.trim()).filter(Boolean),
      use: kv["USE"] ?? "",
      images: slideImages(s),
    });
  }
  return out;
}

export interface MsParsed {
  source_slide_id: string;
  client_raw: string;
  year_month: string | null;
  note: string;
  video_urls: string[];
  images: SlideImage[];
}

export function parseMsSlides(slides: Slide[]): MsParsed[] {
  const out: MsParsed[] = [];
  for (const s of slides) {
    const kv = tableKV(s);
    const client = kv["광고주"];
    if (!client) continue;
    const note = (kv["특이사항"] ?? "").replace(/^-$/, "");
    out.push({
      source_slide_id: s.objectId ?? "",
      client_raw: client,
      year_month: parseKoreanMonth(kv["제작일자"]),
      note,
      video_urls: slideLinks(s),
      images: slideImages(s),
    });
  }
  return out;
}
