import type { Filters } from "../lib/filter";
import type { PublicPortfolioItem } from "../types";

function uniq(arr: string[]) { return [...new Set(arr)].sort(); }

function Group({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {options.map((o) => (
          <label key={o} style={{ fontSize: 12, padding: "3px 9px", borderRadius: 12, cursor: "pointer", border: "1px solid", borderColor: selected.includes(o) ? "#4f46e5" : "#e0e0e0", background: selected.includes(o) ? "#ede9fe" : "#fafafa", color: selected.includes(o) ? "#4f46e5" : "#333", fontWeight: selected.includes(o) ? 600 : 400 }}>
            <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggle(o)} style={{ display: "none" }} />{o}
          </label>
        ))}
      </div>
    </div>
  );
}

export function FilterSidebar({ items, filters, setFilters }: { items: PublicPortfolioItem[]; filters: Filters; setFilters: (f: Filters) => void }) {
  const toggle = (key: keyof Filters, v: string) => {
    const cur = filters[key] as string[];
    setFilters({ ...filters, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  const activeCount = Object.entries(filters)
    .filter(([k]) => k !== "ai_used")
    .reduce((n, [, v]) => n + (Array.isArray(v) ? v.length : 0), 0)
    + (filters.ai_used !== null ? 1 : 0);

  return (
    <aside style={{ width: 200, flexShrink: 0 }}>
      {activeCount > 0 && (
        <button onClick={() => setFilters({ industry: [], platform: [], campaign_objective: [], target_audience: [], production_type: [], visual_mood: [], content_type: [], ai_used: null, year_month: [], client: [] })}
          style={{ width: "100%", marginBottom: 14, fontSize: 12, padding: "5px 0", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", cursor: "pointer" }}>
          필터 초기화 ({activeCount})
        </button>
      )}

      <Group title="업종" options={uniq(items.map((i) => i.industry).filter(v => v && v !== "미분류"))} selected={filters.industry} onToggle={(v) => toggle("industry", v)} />
      <Group title="매체 / 플랫폼" options={uniq(items.flatMap((i) => i.platform))} selected={filters.platform} onToggle={(v) => toggle("platform", v)} />
      <Group title="캠페인 목적" options={uniq(items.flatMap((i) => i.campaign_objective))} selected={filters.campaign_objective} onToggle={(v) => toggle("campaign_objective", v)} />
      <Group title="타겟 고객층" options={uniq(items.flatMap((i) => i.target_audience))} selected={filters.target_audience} onToggle={(v) => toggle("target_audience", v)} />
      <Group title="제작 방식" options={uniq(items.flatMap((i) => i.production_type))} selected={filters.production_type} onToggle={(v) => toggle("production_type", v)} />
      <Group title="비주얼 무드" options={uniq(items.flatMap((i) => i.visual_mood))} selected={filters.visual_mood} onToggle={(v) => toggle("visual_mood", v)} />
      <Group title="콘텐츠 종류" options={uniq(items.flatMap((i) => i.content_type))} selected={filters.content_type} onToggle={(v) => toggle("content_type", v)} />
      <Group title="광고주" options={uniq(items.map((i) => i.client))} selected={filters.client} onToggle={(v) => toggle("client", v)} />
      <Group title="제작월" options={uniq(items.map((i) => i.year_month ?? "")).filter(Boolean)} selected={filters.year_month} onToggle={(v) => toggle("year_month", v)} />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>AI 활용</div>
        <button onClick={() => setFilters({ ...filters, ai_used: filters.ai_used === true ? null : true })}
          style={{ fontSize: 12, padding: "3px 9px", borderRadius: 12, border: "1px solid", borderColor: filters.ai_used ? "#4f46e5" : "#e0e0e0", background: filters.ai_used ? "#ede9fe" : "#fafafa", color: filters.ai_used ? "#4f46e5" : "#333", cursor: "pointer" }}>
          AI활용만
        </button>
      </div>
    </aside>
  );
}
