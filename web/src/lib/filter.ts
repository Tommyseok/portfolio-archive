import type { Item } from "../types";
import { tagsOf } from "../types";

export interface Filters {
  category_group: string[];
  industry: string[];
  content_type: string[]; // 소재타입
  tags: string[];         // 소구포인트 + 수기 태그 (복수 선택)
  client: string[];
  source_team: string[];
  bidding: boolean | null;
  q: string;              // 자유 텍스트
}

export const emptyFilters: Filters = {
  category_group: [],
  industry: [],
  content_type: [],
  tags: [],
  client: [],
  source_team: [],
  bidding: null,
  q: "",
};

export const activeFilterCount = (f: Filters) =>
  f.category_group.length + f.industry.length + f.content_type.length +
  f.tags.length + f.client.length + f.source_team.length +
  (f.bidding !== null ? 1 : 0) + (f.q.trim() ? 1 : 0);

const some = (sel: string[], vals: (string | null)[]) =>
  sel.length === 0 || sel.some((s) => vals.includes(s));

export function keywordMatch(it: Item, q: string): boolean {
  if (!q.trim()) return true;
  const hay = [
    it.client, it.client_raw, it.title, it.overview, it.search_summary,
    it.custom_description ?? "", it.industry ?? "", it.category_group ?? "",
    ...(it.keywords ?? []), ...tagsOf(it), ...(it.tools ?? []),
    ...(it.content_type ?? []), ...(it.creators ?? []),
  ].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

export function applyFilters(items: Item[], f: Filters): Item[] {
  return items.filter((it) =>
    some(f.category_group, [it.category_group]) &&
    some(f.industry, [it.industry]) &&
    some(f.content_type, it.content_type) &&
    some(f.tags, tagsOf(it)) &&
    some(f.client, [it.client]) &&
    some(f.source_team, [it.source_team]) &&
    (f.bidding === null || it.is_bidding === f.bidding) &&
    keywordMatch(it, f.q),
  );
}
