import type { Item } from "../types";
import { tagsOf, formatKey } from "../types";

export interface Filters {
  category_group: string[];
  industry: string[];
  format: string[];       // 소재타입 세부 — "영상>숏폼" 복합 키
  tags: string[];         // 소구포인트 + 수기 태그 (복수 선택)
  client: string[];
  production_team: string[];   // 제작팀
  team: string[];              // 세부 팀 (DS1팀 등)
  production_method: string[]; // 제작방식
  bidding: boolean | null;
  q: string;              // 자유 텍스트
}

export const emptyFilters: Filters = {
  category_group: [],
  industry: [],
  format: [],
  tags: [],
  client: [],
  production_team: [],
  team: [],
  production_method: [],
  bidding: null,
  q: "",
};

export const activeFilterCount = (f: Filters) =>
  f.category_group.length + f.industry.length + f.format.length +
  f.tags.length + f.client.length + f.production_team.length + f.team.length + f.production_method.length +
  (f.bidding !== null ? 1 : 0) + (f.q.trim() ? 1 : 0);

const some = (sel: string[], vals: (string | null)[]) =>
  sel.length === 0 || sel.some((s) => vals.includes(s));

export function keywordMatch(it: Item, q: string): boolean {
  if (!q.trim()) return true;
  const hay = [
    it.client, it.client_raw, it.title, it.overview, it.search_summary,
    it.custom_description ?? "", it.industry ?? "", it.category_group ?? "",
    it.media_type ?? "", it.format ?? "", it.team ?? "", it.production_method ?? "", it.production_team ?? "",
    ...(it.keywords ?? []), ...tagsOf(it), ...(it.tools ?? []),
    ...(it.content_type ?? []), ...(it.creators ?? []),
  ].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

export function applyFilters(items: Item[], f: Filters): Item[] {
  return items.filter((it) =>
    some(f.category_group, [it.category_group]) &&
    some(f.industry, [it.industry]) &&
    some(f.format, [formatKey(it.media_type, it.format)]) &&
    some(f.tags, tagsOf(it)) &&
    some(f.client, [it.client]) &&
    some(f.production_team, [it.production_team]) &&
    some(f.team, [it.team]) &&
    some(f.production_method, [it.production_method]) &&
    (f.bidding === null || it.is_bidding === f.bidding) &&
    keywordMatch(it, f.q),
  );
}
