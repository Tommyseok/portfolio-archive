import { useMemo, useState } from "react";
import type { Item } from "../types";
import type { Filters } from "../lib/filter";
import { applyFilters } from "../lib/filter";
import { FilterBar } from "../components/FilterBar";
import { ItemGrid } from "../components/ItemGrid";
import { ItemModal } from "../components/ItemModal";

export function Showcase({ items, loading, filters, setFilters, staff, email, onSaved }: {
  items: Item[];
  loading: boolean;
  filters: Filters;
  setFilters: (f: Filters) => void;
  staff: boolean;
  email: string | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState<Item | null>(null);
  // Showcase 는 외부 공개 동의 건만 (스태프 계정으로 봐도 동일 기준)
  const pool = useMemo(() => items.filter((i) => i.showcase_approved), [items]);
  const filtered = useMemo(() => applyFilters(pool, filters), [pool, filters]);
  const clients = new Set(pool.map((i) => i.client)).size;

  return (
    <>
      <section className="container hero">
        <div>
          <h1>On-brand, on-time,<br />built to <em>perform</em>.</h1>
          <p style={{ marginTop: 14 }}>
            촬영 숏폼부터 생성형 AI 이미지·영상까지 — 매드업 크리에이티브 팀이 만든 작업의 셀렉션.
          </p>
        </div>
        <div className="hero-stats">
          <div className="hstat"><div className="num">{pool.length}</div><div className="lbl">공개 소재</div></div>
          <div className="hstat"><div className="num">{clients}</div><div className="lbl">광고주</div></div>
        </div>
      </section>
      <FilterBar items={pool} filters={filters} setFilters={setFilters} resultCount={filtered.length} title="Showcase" />
      {!loading && pool.length === 0 ? (
        <div className="container empty">
          <div className="big">Coming soon</div>
          <p>공개 승인된 소재가 준비되는 대로 이곳에 전시됩니다.{staff ? " — Explore에서 소재를 열어 'Showcase 외부 공개'를 켜면 나타납니다." : ""}</p>
        </div>
      ) : (
        <ItemGrid items={filtered} onOpen={setOpen} staff={staff} loading={loading} />
      )}
      <ItemModal item={open} onClose={() => setOpen(null)} staff={staff} email={email} onSaved={onSaved} />
    </>
  );
}
