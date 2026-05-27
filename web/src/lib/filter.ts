import type { PublicPortfolioItem } from "../types";

export interface Filters {
  industry: string[];
  platform: string[];
  campaign_objective: string[];
  target_audience: string[];
  production_type: string[];
  visual_mood: string[];
  content_type: string[];
  ai_used: boolean | null;
  year_month: string[];
  client: string[];
}

const some = (sel: string[], vals: string[]) => sel.length === 0 || sel.some((s) => vals.includes(s));

export function applyFilters(items: PublicPortfolioItem[], f: Filters): PublicPortfolioItem[] {
  return items.filter((it) =>
    some(f.industry, [it.industry]) &&
    some(f.platform, it.platform) &&
    some(f.campaign_objective, it.campaign_objective) &&
    some(f.target_audience, it.target_audience) &&
    some(f.production_type, it.production_type) &&
    some(f.visual_mood, it.visual_mood) &&
    some(f.content_type, it.content_type) &&
    (f.ai_used === null || it.ai_used === f.ai_used) &&
    some(f.year_month, it.year_month ? [it.year_month] : []) &&
    some(f.client, [it.client]),
  );
}

export function keywordMatch(it: PublicPortfolioItem, q: string): boolean {
  if (!q.trim()) return true;
  const hay = [
    it.client, it.project_title, it.overview, it.search_summary,
    ...it.keywords, ...it.platform, ...it.campaign_objective,
    ...it.target_audience, ...it.production_type, ...it.visual_mood,
  ].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}
