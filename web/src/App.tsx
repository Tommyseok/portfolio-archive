import { useEffect, useMemo, useState } from "react";
import type { PublicPortfolioItem } from "./types";
import { applyFilters, keywordMatch, type Filters } from "./lib/filter";
import { Gallery } from "./components/Gallery";
import { FilterSidebar } from "./components/FilterSidebar";
import { SearchBar } from "./components/SearchBar";
import { StatsPanel } from "./components/StatsPanel";
import { DetailModal } from "./components/DetailModal";

const emptyFilters: Filters = { industry: [], platform: [], campaign_objective: [], target_audience: [], production_type: [], visual_mood: [], content_type: [], ai_used: null, year_month: [], client: [] };

export default function App() {
  const [all, setAll] = useState<PublicPortfolioItem[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState<"gallery" | "stats">("gallery");
  const [open, setOpen] = useState<PublicPortfolioItem | null>(null);
  const [searchIds, setSearchIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [kw, setKw] = useState("");

  useEffect(() => { fetch("catalog.public.json").then((r) => r.json()).then(setAll).catch(() => setAll([])); }, []);

  const filtered = useMemo(() => {
    let r = applyFilters(all, filters);
    if (searchIds) {
      const order = new Map(searchIds.map((id, i) => [id, i]));
      r = r.filter((i) => order.has(i.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    } else if (kw) {
      r = r.filter((i) => keywordMatch(i, kw));
    }
    return r;
  }, [all, filters, searchIds, kw]);

  async function onSearch(q: string) {
    setLoading(true); setKw(q); setSearchIds(null);
    try {
      const items = all.map(({ id, client, project_title, search_summary, keywords, platform, campaign_objective, target_audience, production_type, visual_mood, industry }) =>
        ({ id, client, project_title, search_summary, keywords, platform, campaign_objective, target_audience, production_type, visual_mood, industry }));
      const res = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q, items }) });
      if (res.ok) setSearchIds((await res.json()).ids ?? []);
    } catch { /* 키워드 폴백 유지 */ }
    setLoading(false);
  }
  function onClear() { setKw(""); setSearchIds(null); }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22 }}>매드업 촬영·AI 영상 포트폴리오</h1>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button onClick={() => setTab("gallery")} style={tabStyle(tab === "gallery")}>갤러리</button>
        <button onClick={() => setTab("stats")} style={tabStyle(tab === "stats")}>통계</button>
      </div>
      {tab === "gallery" ? (
        <>
          <SearchBar onSearch={onSearch} onClear={onClear} loading={loading} />
          <div style={{ display: "flex", gap: 24 }}>
            <FilterSidebar items={all} filters={filters} setFilters={setFilters} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{filtered.length}건{searchIds ? " · 자연어 검색 결과" : ""}</div>
              <Gallery items={filtered} onOpen={setOpen} />
            </div>
          </div>
        </>
      ) : <StatsPanel items={all} />}
      <DetailModal item={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return { padding: "6px 16px", borderRadius: 8, border: "1px solid #ddd", background: active ? "#334" : "#fff", color: active ? "#fff" : "#333", cursor: "pointer" };
}
