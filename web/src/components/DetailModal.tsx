import type { PublicPortfolioItem } from "../types";
import { AccuracyBadge } from "./AccuracyBadge";

function TagRow({ items, bg, color }: { items: string[]; bg: string; color: string }) {
  if (!items?.length) return null;
  return (
    <>
      {items.map((v) => (
        <span key={v} style={{ fontSize: 11, background: bg, color, borderRadius: 4, padding: "2px 8px" }}>{v}</span>
      ))}
    </>
  );
}

export function DetailModal({ item, onClose }: { item: PublicPortfolioItem | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 10 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, maxWidth: 580, width: "100%", overflow: "hidden", maxHeight: "90vh", overflowY: "auto" }}>
        <img src={item.thumbnail ?? ""} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
        <div style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{item.client}</div>
          <div style={{ color: "#555", marginBottom: 10 }}>{item.project_title}</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#333" }}>{item.overview}</p>

          {/* AE 세일즈 라벨 */}
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            <LabelRow label="매체" items={item.platform} bg="#eff6ff" color="#1d4ed8" />
            <LabelRow label="캠페인 목적" items={item.campaign_objective} bg="#f0fdf4" color="#166534" />
            <LabelRow label="타겟" items={item.target_audience} bg="#fff7ed" color="#c2410c" />
            <LabelRow label="제작방식" items={item.production_type} bg="#faf5ff" color="#7e22ce" />
            <LabelRow label="비주얼 무드" items={item.visual_mood} bg="#fdf2f8" color="#9d174d" />
          </div>

          {/* 기본 정보 */}
          <div style={{ fontSize: 12, color: "#666", marginTop: 14, borderTop: "1px solid #f0f0f0", paddingTop: 12 }}>
            제작월 {item.year_month} · {item.in_house ? "내부제작" : "외주"} · {item.piece_count ?? "-"}편
            · 업종 {item.industry}<AccuracyBadge />
          </div>

          {/* 키워드 */}
          {item.keywords?.length > 0 && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
              {item.keywords.map((k) => (
                <span key={k} style={{ fontSize: 11, background: "#f3f4f6", color: "#6b7280", borderRadius: 4, padding: "1px 6px" }}>#{k}</span>
              ))}
            </div>
          )}

          {item.video_url && (
            <a href={item.video_url} target="_blank" rel="noreferrer"
              style={{ display: "inline-block", marginTop: 14, padding: "10px 20px", background: "#1e1b4b", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 14 }}>
              영상 보기 ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function LabelRow({ label, items, bg, color }: { label: string; items: string[]; bg: string; color: string }) {
  if (!items?.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <span style={{ fontSize: 11, color: "#9ca3af", width: 72, flexShrink: 0 }}>{label}</span>
      <TagRow items={items} bg={bg} color={color} />
    </div>
  );
}
