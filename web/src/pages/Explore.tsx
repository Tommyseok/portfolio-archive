import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Item } from "../types";
import type { Filters } from "../lib/filter";
import { applyFilters } from "../lib/filter";
import { FilterBar } from "../components/FilterBar";
import { ItemGrid } from "../components/ItemGrid";
import { ItemModal } from "../components/ItemModal";
import { LoginGate } from "../components/LoginGate";

export function Explore({ items, loading, filters, setFilters, staff, ready, email, onSaved }: {
  items: Item[];
  loading: boolean;
  filters: Filters;
  setFilters: (f: Filters) => void;
  staff: boolean;
  ready: boolean;
  email: string | null;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState<Item | null>(null);
  const [params, setParams] = useSearchParams();

  // Directory 에서 넘어온 프리셋 (?client=… / ?team=… / ?creator=…)
  useEffect(() => {
    const client = params.get("client");
    const team = params.get("team");
    const subteam = params.get("subteam");
    const creator = params.get("creator");
    if (client || team || subteam || creator) {
      setFilters({
        ...filters,
        client: client ? [client] : filters.client,
        source_team: team ? [team] : filters.source_team,
        team: subteam ? [subteam] : filters.team,
        q: creator ?? filters.q,
      });
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const filtered = useMemo(() => applyFilters(items, filters), [items, filters]);

  if (!ready) return <div className="container grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skel" />)}</div>;
  if (!staff) return <LoginGate />;

  return (
    <>
      <FilterBar items={items} filters={filters} setFilters={setFilters} resultCount={filtered.length} title="Explore" />
      <ItemGrid items={filtered} onOpen={setOpen} staff={staff} loading={loading} />
      <ItemModal item={open} onClose={() => setOpen(null)} staff={staff} email={email}
        onSaved={() => { onSaved(); setOpen(null); }} />
    </>
  );
}
