import { useEffect, useRef, useState } from "react";
import type { Item } from "../types";
import { useReveal } from "../lib/useReveal";

const CYCLE_MS = 1100;
const MAX_LAYERS = 4;

/** 타일 커버로 쓸 이미지들 — 호버 시 순환 */
const imagesOf = (i: Item): string[] => {
  const pool = [...(i.asset_images ?? []), ...(i.extra_images ?? [])];
  if (pool.length === 0 && i.thumbnail) pool.push(i.thumbnail);
  return pool.slice(0, MAX_LAYERS);
};

function WorkTile({ item, onOpen }: { item: Item; onOpen: (i: Item) => void }) {
  const { ref, seen } = useReveal<HTMLDivElement>(0.12);
  const images = imagesOf(item);
  const [idx, setIdx] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCycle = () => {
    if (images.length < 2 || timer.current) return;
    timer.current = setInterval(() => setIdx((v) => (v + 1) % images.length), CYCLE_MS);
  };
  const stopCycle = () => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    setIdx(0);
  };
  useEffect(() => stopCycle, []);

  const services = [item.media_type, item.format].filter(Boolean).join(", ");

  return (
    <div
      ref={ref}
      className={"work-tile" + (seen ? " in" : "")}
      onClick={() => onOpen(item)}
      onMouseEnter={startCycle}
      onMouseLeave={stopCycle}
    >
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === 0 ? `${item.client} — ${item.title}` : ""}
          loading="lazy"
          className={"wt-img" + (i === idx ? " front" : "")}
        />
      ))}
      {item.year_month && <span className="wt-count">{item.year_month}</span>}
      <div className="wt-label">
        <div className="wt-name">{item.client}<span className="plus">+</span></div>
        {services && <div className="wt-services">{services}</div>}
      </div>
    </div>
  );
}

export function WorkGrid({ items, onOpen, loading }: {
  items: Item[];
  onOpen: (i: Item) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="work-grid">
        {Array.from({ length: 4 }, (_, i) => <div key={i} className="work-skel" />)}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="container empty">
        <div className="big">No results</div>
        <p>조건에 맞는 프로젝트가 없습니다. 필터를 조정해 보세요.</p>
      </div>
    );
  }
  return (
    <div className="work-grid">
      {items.map((it) => <WorkTile key={it.id} item={it} onOpen={onOpen} />)}
    </div>
  );
}
