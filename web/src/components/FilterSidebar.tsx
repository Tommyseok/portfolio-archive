import type { Filters } from "../lib/filter";
import type { PublicPortfolioItem } from "../types";

function uniq(arr: string[]) { return [...new Set(arr)].sort(); }

function Group({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => (
          <label key={o} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 12, cursor: "pointer", border: "1px solid", borderColor: selected.includes(o) ? "#446" : "#ddd", background: selected.includes(o) ? "#eef" : "#fff" }}>
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
  return (
    <aside style={{ width: 220, flexShrink: 0 }}>
      <Group title="업종" options={uniq(items.map((i) => i.industry))} selected={filters.industry} onToggle={(v) => toggle("industry", v)} />
      <Group title="포맷·컨셉" options={uniq(items.flatMap((i) => i.format_concept))} selected={filters.format_concept} onToggle={(v) => toggle("format_concept", v)} />
      <Group title="무드" options={uniq(items.flatMap((i) => i.mood))} selected={filters.mood} onToggle={(v) => toggle("mood", v)} />
      <Group title="콘텐츠 종류" options={uniq(items.flatMap((i) => i.content_type))} selected={filters.content_type} onToggle={(v) => toggle("content_type", v)} />
      <Group title="광고주" options={uniq(items.map((i) => i.client))} selected={filters.client} onToggle={(v) => toggle("client", v)} />
      <Group title="제작월" options={uniq(items.map((i) => i.year_month ?? "")).filter(Boolean)} selected={filters.year_month} onToggle={(v) => toggle("year_month", v)} />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>AI 활용</div>
        <button onClick={() => setFilters({ ...filters, ai_used: filters.ai_used === true ? null : true })} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 12, border: "1px solid", borderColor: filters.ai_used ? "#446" : "#ddd" }}>AI활용만</button>
      </div>
    </aside>
  );
}
