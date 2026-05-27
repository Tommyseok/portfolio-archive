import type { PublicPortfolioItem } from "../types";
import { AccuracyBadge } from "./AccuracyBadge";

export function DetailModal({ item, onClose }: { item: PublicPortfolioItem | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 10 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, maxWidth: 560, width: "100%", overflow: "hidden" }}>
        <img src={item.thumbnail ?? ""} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
        <div style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{item.client}</div>
          <div style={{ color: "#555", marginBottom: 10 }}>{item.project_title}</div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{item.overview}</p>
          <div style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
            제작월 {item.year_month} · {item.in_house ? "내부제작" : "외주"} · {item.piece_count ?? "-"}편<br />
            업종 {item.industry} · 포맷 {item.format_concept.join(", ")} · 무드 {item.mood.join(", ")}<AccuracyBadge />
          </div>
          {(item.visual_style?.length > 0 || item.animation_type?.length > 0) && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {item.visual_style?.map((v) => (
                <span key={v} style={{ fontSize: 11, background: "#f0e8ff", color: "#6b21a8", borderRadius: 4, padding: "2px 8px" }}>🎨 {v}</span>
              ))}
              {item.color_tone?.map((c) => (
                <span key={c} style={{ fontSize: 11, background: "#fff3e0", color: "#b45309", borderRadius: 4, padding: "2px 8px" }}>🎨 {c}</span>
              ))}
              {item.animation_type?.map((a) => (
                <span key={a} style={{ fontSize: 11, background: "#e0f2fe", color: "#0369a1", borderRadius: 4, padding: "2px 8px" }}>▶ {a}</span>
              ))}
              {item.creative_direction?.map((d) => (
                <span key={d} style={{ fontSize: 11, background: "#f0fdf4", color: "#166534", borderRadius: 4, padding: "2px 8px" }}>💡 {d}</span>
              ))}
            </div>
          )}
          {item.video_url && <a href={item.video_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 14, padding: "10px 18px", background: "#334", color: "#fff", borderRadius: 8, textDecoration: "none" }}>영상 보기 ↗</a>}
        </div>
      </div>
    </div>
  );
}
