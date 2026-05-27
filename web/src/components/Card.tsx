import type { PublicPortfolioItem } from "../types";
import { AccuracyBadge } from "./AccuracyBadge";

export function Card({ item, onOpen }: { item: PublicPortfolioItem; onOpen: (i: PublicPortfolioItem) => void }) {
  return (
    <button onClick={() => onOpen(item)} style={{ textAlign: "left", border: "1px solid #eee", borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "#fff", padding: 0 }}>
      <img src={item.thumbnail ?? ""} alt={item.project_title} loading="lazy" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", background: "#f3f3f3" }} />
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {item.content_type.map((c) => <span key={c} style={{ fontSize: 11, background: "#eef", borderRadius: 4, padding: "1px 6px" }}>{c}</span>)}
          {item.ai_used && <span style={{ fontSize: 11, background: "#efe", borderRadius: 4, padding: "1px 6px" }}>AI활용</span>}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.client}</div>
        <div style={{ fontSize: 12, color: "#555", lineHeight: 1.4 }}>{item.project_title}</div>
        <div style={{ fontSize: 11, color: "#999", marginTop: 6 }}>{item.year_month} · {item.industry}<AccuracyBadge /></div>
      </div>
    </button>
  );
}
