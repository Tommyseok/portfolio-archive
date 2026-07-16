import { useMemo, useRef, useState } from "react";
import type { Item } from "../types";
import type { Filters } from "../lib/filter";
import { applyFilters } from "../lib/filter";
import { FilterBar } from "../components/FilterBar";
import { ItemGrid } from "../components/ItemGrid";
import { ItemModal } from "../components/ItemModal";
import { HeroShowcase } from "../components/HeroShowcase";

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
  const gridRef = useRef<HTMLDivElement>(null);
  // Showcase 는 외부 공개 동의 건만 (스태프 계정으로 봐도 동일 기준)
  const pool = useMemo(() => items.filter((i) => i.showcase_approved), [items]);
  const filtered = useMemo(() => applyFilters(pool, filters), [pool, filters]);

  return (
    <>
      <HeroShowcase
        pool={pool}
        allItems={items}
        staff={staff}
        onOpen={setOpen}
        onBrowse={() => gridRef.current?.scrollIntoView({ behavior: "smooth" })}
      />
      <div ref={gridRef}>
        <FilterBar items={pool} filters={filters} setFilters={setFilters} resultCount={filtered.length} title="Showcase" />
        {!loading && pool.length === 0 ? (
          <div className="container empty">
            <div className="big">Coming soon</div>
            <p>공개 승인된 소재가 준비되는 대로 이곳에 전시됩니다.{staff ? " — Explore에서 소재를 열어 'Showcase 외부 공개'를 켜면 나타납니다." : ""}</p>
          </div>
        ) : (
          <ItemGrid items={filtered} onOpen={setOpen} staff={staff} loading={loading} />
        )}
      </div>
      <ItemModal item={open} onClose={() => setOpen(null)} staff={staff} email={email} onSaved={onSaved} />
    </>
  );
}
