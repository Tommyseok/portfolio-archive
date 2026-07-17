import { useEffect } from "react";
import type { Item } from "../types";
import { tagsOf } from "../types";

/** 풀스크린 케이스 스터디 — Showcase 타일 클릭 시 (외부 공개용, 편집 없음) */
export function CaseView({ item, onClose }: { item: Item | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [item, onClose]);

  if (!item) return null;

  const gallery = [...(item.asset_images ?? []), ...(item.extra_images ?? [])];
  if (gallery.length === 0 && item.thumbnail) gallery.push(item.thumbnail);
  const desc = item.custom_description || item.overview || item.search_summary;
  const kicker = [item.media_type, item.format].filter(Boolean).join(", ");

  return (
    <div className="case-view">
      <div className="case-top">
        <span className="case-brand">madup — selected work</span>
        <button className="case-close" onClick={onClose} aria-label="닫기">✕</button>
      </div>

      <div className="case-gallery">
        {gallery.map((src) => (
          <img key={src} src={src} alt={`${item.client} 크리에이티브`} loading="lazy" />
        ))}
      </div>

      <div className="case-info">
        <div>
          <h2 className="case-title">{item.client}</h2>
          <div className="case-kicker">{kicker || item.title}</div>
        </div>
        <div>
          {desc && <p className="case-desc">{desc}</p>}
          <div className="case-meta">
            {item.year_month && <span className="badge">{item.year_month}</span>}
            {item.production_team && <span className="badge">{item.production_team}</span>}
            {item.production_method && <span className="badge">{item.production_method}</span>}
            {item.industry && <span className="badge">{item.industry}</span>}
            {item.piece_count !== null && <span className="badge">{item.piece_count}편</span>}
            {item.tools.slice(0, 4).map((t) => <span key={t} className="badge">{t}</span>)}
            {tagsOf(item).slice(0, 5).map((t) => <span key={t} className="badge">#{t}</span>)}
          </div>
          {item.video_urls.length > 0 && (
            <div className="case-actions">
              {item.video_urls.map((u, i) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="btn">
                  영상 보기{item.video_urls.length > 1 ? ` ${i + 1}` : ""} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
