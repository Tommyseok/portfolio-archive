import { useMemo } from "react";
import type { Item } from "../types";

/** 썸네일 무한 마퀴 한 줄 (CSS transform 애니메이션, hover 시 일시정지) */
function MarqueeRow({ items, reverse, onOpen }: { items: Item[]; reverse?: boolean; onOpen: (i: Item) => void }) {
  if (items.length === 0) return null;
  // 두 벌 이어붙여 -50% 이동으로 끊김 없는 루프
  const doubled = [...items, ...items];
  return (
    <div className="mq-row">
      <div className={"mq-track" + (reverse ? " rev" : "")} style={{ animationDuration: `${Math.max(30, items.length * 6)}s` }}>
        {doubled.map((it, i) => (
          <button key={it.id + "-" + i} className="mq-card" onClick={() => onOpen(it)} tabIndex={i < items.length ? 0 : -1}>
            {it.thumbnail && <img src={it.thumbnail} alt={it.client} loading="lazy" />}
            <span className="mq-label">{it.client}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function HeroShowcase({ pool, allItems, staff, onOpen, onBrowse }: {
  pool: Item[];          // 공개 승인 소재 (외부 노출 안전)
  allItems: Item[];      // 스태프 미리보기용 전체
  staff: boolean;
  onOpen: (i: Item) => void;
  onBrowse: () => void;
}) {
  // 마퀴 소스: 승인 소재 우선. 승인 0건 + 스태프(또는 로컬 개발) → 전체에서 표본 (미리보기 표시)
  const previewMode = pool.length === 0 && (staff || import.meta.env.DEV);
  const source = pool.length > 0 ? pool : previewMode ? allItems : [];
  const withThumb = useMemo(() => source.filter((i) => i.thumbnail), [source]);
  const rowA = useMemo(() => withThumb.filter((_, i) => i % 2 === 0).slice(0, 14), [withThumb]);
  const rowB = useMemo(() => withThumb.filter((_, i) => i % 2 === 1).slice(0, 14), [withThumb]);
  const clients = [...new Set(source.map((i) => i.client))];

  return (
    <>
      <section className="container hero2">
        <div className="hero2-copy">
          <h1>
            필요한 크리에이티브,<br />이미 <em>만들어봤습니다</em>.
          </h1>
          <p>
            촬영 숏폼부터 생성형 AI 이미지·영상까지 — 매드업 크리에이티브 팀이
            {clients.length > 0 ? ` ${clients.length}개 브랜드와` : ""} 만든 작업의 셀렉션입니다.
          </p>
          <div className="hero2-cta">
            <button className="btn" onClick={onBrowse}>작업 둘러보기 ↓</button>
            {pool.length > 0 && (
              <div className="hstat inline"><span className="num">{pool.length}</span><span className="lbl">공개 소재</span></div>
            )}
          </div>
        </div>
      </section>

      {(rowA.length > 0 || rowB.length > 0) && (
        <section className="mq-wrap">
          {previewMode && <div className="container"><span className="badge bidding">스태프 미리보기 — 공개 승인 전 소재는 외부에 노출되지 않습니다</span></div>}
          <MarqueeRow items={rowA} onOpen={onOpen} />
          <MarqueeRow items={rowB} reverse onOpen={onOpen} />
        </section>
      )}

      {clients.length > 2 && (
        <section className="client-strip">
          <div className="container" style={{ overflow: "hidden" }}>
            <div className="client-track">
              {[...clients, ...clients].map((c, i) => <span key={c + i}>{c}</span>)}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
