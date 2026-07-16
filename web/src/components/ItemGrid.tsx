import { useEffect, useState } from "react";
import type { Item } from "../types";
import { tagsOf } from "../types";

const PAGE = 48;

function Card({ item, onOpen, staff }: { item: Item; onOpen: (i: Item) => void; staff: boolean }) {
  const img = item.thumbnail ?? item.extra_images?.[0] ?? null;
  return (
    <div className="card" onClick={() => onOpen(item)}>
      <div className="card-thumb">
        {img ? <img src={img} alt={item.title} loading="lazy" /> : null}
        <div className="card-overlay">
          <span>{item.custom_description || item.overview || item.search_summary || item.title}</span>
        </div>
      </div>
      <div className="card-meta">
        <span className={"badge team-" + item.source_team}>{item.source_team}</span>
        {item.is_bidding && <span className="badge bidding">비딩</span>}
        {staff && item.showcase_approved && <span className="badge showcase">공개</span>}
        <span className="card-client">{item.client}</span>
        <span className="card-sub">{item.year_month ?? "—"}</span>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", padding: "6px 4px 0" }}>
        {item.industry && <span className="badge">{item.industry}</span>}
        {tagsOf(item).slice(0, 3).map((t) => <span key={t} className="badge">#{t}</span>)}
      </div>
    </div>
  );
}

export function ItemGrid({ items, onOpen, staff, loading }: {
  items: Item[];
  onOpen: (i: Item) => void;
  staff: boolean;
  loading?: boolean;
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
        {items.slice(0, visible).map((it) => <Card key={it.id} item={it} onOpen={onOpen} staff={staff} />)}
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
