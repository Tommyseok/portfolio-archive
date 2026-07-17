import { useEffect, useState } from "react";
import type { Item } from "../types";
import { tagsOf } from "../types";
import type { SocialState } from "../lib/useData";

const PAGE = 48;

const HeartIcon = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 14c1.5-1.5 2.5-3 2.5-5A4.5 4.5 0 0 0 17 4.5c-2 0-3.6 1-5 3-1.4-2-3-3-5-3A4.5 4.5 0 0 0 2.5 9c0 2 1 3.5 2.5 5l7 7 7-7Z" />
  </svg>
);
const CommentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.8 8.8 0 0 1-3.8-.8L3 20l1-4.9a8.1 8.1 0 0 1-1-3.6 8.4 8.4 0 0 1 9-8.4 8.4 8.4 0 0 1 9 8.4Z" />
  </svg>
);

function Card({ item, onOpen, email, social, onToggleLike, onTogglePublish }: {
  item: Item;
  onOpen: (i: Item) => void;
  email: string | null;
  social: SocialState;
  onToggleLike: (i: Item) => void;
  onTogglePublish: (i: Item) => void;
}) {
  // 추출된 크리에이티브 이미지가 있으면 슬라이드 캡처 대신 그걸 커버로
  const img = item.asset_images?.[0] ?? item.thumbnail ?? item.extra_images?.[0] ?? null;
  const likers = social.likes[item.id] ?? [];
  const liked = !!email && likers.includes(email);
  const comments = social.commentCounts[item.id] ?? 0;

  return (
    <div className="card" onClick={() => onOpen(item)}>
      <div className="card-thumb">
        {img ? <img src={img} alt={item.title} loading="lazy" /> : null}
        <div className="card-overlay">
          <span>{item.custom_description || item.overview || item.search_summary || item.title}</span>
        </div>
      </div>
      <div className="card-actions">
        <button
          className={"act" + (liked ? " liked" : "")}
          onClick={(e) => { e.stopPropagation(); onToggleLike(item); }}
          aria-label="좋아요"
        >
          <HeartIcon filled={liked} />{likers.length > 0 && likers.length}
        </button>
        <button className="act" onClick={(e) => { e.stopPropagation(); onOpen(item); }} aria-label="코멘트 보기">
          <CommentIcon />{comments > 0 && comments}
        </button>
        <button
          className={"act pub" + (item.showcase_approved ? " on" : "")}
          onClick={(e) => { e.stopPropagation(); onTogglePublish(item); }}
          title={item.showcase_approved ? "Showcase 공개 중 — 클릭하면 비공개" : "클릭하면 외부 Showcase에 공개"}
        >
          {item.showcase_approved ? "공개중" : "공개"}
        </button>
      </div>
      <div className="card-meta">
        <span className={"badge team-" + item.source_team}>{item.production_team ?? item.source_team}</span>
        {item.is_bidding && <span className="badge bidding">비딩</span>}
        <span className="card-client">{item.client}</span>
        <span className="card-sub">{item.year_month ?? "—"}</span>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", padding: "6px 4px 0" }}>
        {item.media_type && <span className="badge">{item.media_type}{item.format ? ` · ${item.format}` : ""}</span>}
        {item.industry && <span className="badge">{item.industry}</span>}
        {tagsOf(item).slice(0, 3).map((t) => <span key={t} className="badge">#{t}</span>)}
      </div>
    </div>
  );
}

export function ItemGrid({ items, onOpen, loading, email, social, onToggleLike, onTogglePublish }: {
  items: Item[];
  onOpen: (i: Item) => void;
  staff: boolean;
  loading?: boolean;
  email: string | null;
  social: SocialState;
  onToggleLike: (i: Item) => void;
  onTogglePublish: (i: Item) => void;
}) {
  const [visible, setVisible] = useState(PAGE);
  useEffect(() => { setVisible(PAGE); }, [items]);

  if (loading) {
    return (
      <div className="container grid">
        {Array.from({ length: 9 }, (_, i) => <div key={i} className="skel" />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="container empty">
        <div className="big">No results</div>
        <p>조건에 맞는 소재가 없습니다. 필터를 조정해 보세요.</p>
      </div>
    );
  }
  return (
    <>
      <div className="container grid">
        {items.slice(0, visible).map((it) => (
          <Card key={it.id} item={it} onOpen={onOpen} email={email}
            social={social} onToggleLike={onToggleLike} onTogglePublish={onTogglePublish} />
        ))}
      </div>
      {visible < items.length && (
        <div className="container">
          <button className="btn ghost more-btn" onClick={() => setVisible((v) => v + PAGE)}>
            더보기 · {visible} / {items.length}
          </button>
        </div>
      )}
    </>
  );
}
