import type { PublicPortfolioItem } from "../types";

export interface Filters {
  industry: string[];
  format_concept: string[];
  mood: string[];
  content_type: string[];
  ai_used: boolean | null;
  year_month: string[];
  client: string[];
}

const some = (sel: string[], vals: string[]) => sel.length === 0 || sel.some((s) => vals.includes(s));

export function applyFilters(items: PublicPortfolioItem[], f: Filters): PublicPortfolioItem[] {
  return items.filter((it) =>
    some(f.industry, [it.industry]) &&
    some(f.format_concept, it.format_concept) &&
    some(f.mood, it.mood) &&
    some(f.content_type, it.content_type) &&
    (f.ai_used === null || it.ai_used === f.ai_used) &&
    some(f.year_month, it.year_month ? [it.year_month] : []) &&
    some(f.client, [it.client]),
  );
}

export function keywordMatch(it: PublicPortfolioItem, q: string): boolean {
  if (!q.trim()) return true;
  const hay = [it.client, it.project_title, it.overview, it.search_summary, ...it.keywords, ...it.format_concept, ...it.mood].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}
