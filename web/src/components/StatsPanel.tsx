import type { PublicPortfolioItem } from "../types";

function countBy(items: PublicPortfolioItem[], key: (i: PublicPortfolioItem) => string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const it of items) for (const k of key(it)) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Bar({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return <div>{rows.map(([k, n]) => (
    <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 12 }}>
      <div style={{ width: 110, textAlign: "right", color: "#555" }}>{k}</div>
      <div style={{ height: 14, width: `${(n / max) * 200}px`, background: "#88a", borderRadius: 3 }} />
      <div>{n}</div>
    </div>
  ))}</div>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return <div style={{ background: "#f7f7fb", borderRadius: 10, padding: "14px 20px" }}><div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div><div style={{ fontSize: 12, color: "#777" }}>{label}</div></div>;
}

export function StatsPanel({ items }: { items: PublicPortfolioItem[] }) {
  const total = items.length;
  const totalPieces = items.reduce((s, i) => s + (i.piece_count ?? 0), 0);
  const aiPct = total ? Math.round((items.filter((i) => i.ai_used).length / total) * 100) : 0;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", gap: 24 }}>
        <Stat label="프로젝트" value={total} />
        <Stat label="총 제작 편수" value={totalPieces} />
        <Stat label="AI 활용 비율" value={`${aiPct}%`} />
      </div>
      <div><h4>광고주별</h4><Bar rows={countBy(items, (i) => [i.client])} /></div>
      <div><h4>콘텐츠 유형별</h4><Bar rows={countBy(items, (i) => i.content_type)} /></div>
      <div><h4>업종별</h4><Bar rows={countBy(items, (i) => [i.industry])} /></div>
      <div><h4>월별</h4><Bar rows={countBy(items, (i) => i.year_month ? [i.year_month] : []).sort((a,b)=>a[0].localeCompare(b[0]))} /></div>
    </div>
  );
}
