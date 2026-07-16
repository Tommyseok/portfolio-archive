import { useEffect, useMemo, useRef, useState } from "react";
import type { Item } from "../types";
import { tagsOf, SOURCE_TEAM_LABELS } from "../types";
import type { Filters } from "../lib/filter";
import { emptyFilters, activeFilterCount } from "../lib/filter";

interface Opt { value: string; label?: string; count: number; group?: string }

function countBy(items: Item[], pick: (i: Item) => (string | null)[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const it of items) for (const v of pick(it)) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}

function Pill({ label, opts, selected, onToggle, grouped }: {
  label: string;
  opts: Opt[];
  selected: string[];
  onToggle: (v: string) => void;
  grouped?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const shown = opts.filter((o) => !q || (o.label ?? o.value).toLowerCase().includes(q.toLowerCase()));
  const groups = grouped ? [...new Set(shown.map((o) => o.group ?? ""))] : [""];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className={"fpill" + (selected.length ? " on" : "") + (open ? " open" : "")} onClick={() => setOpen(!open)}>
        {label}
        {selected.length > 0 && <span className="cnt">{selected.length}</span>}
        <span className="caret">▾</span>
      </button>
      {open && (
        <div className="fpanel">
          {opts.length > 7 && (
            <input className="fpanel-search" placeholder="검색…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          )}
          {shown.length === 0 && <div style={{ padding: 10, fontSize: 13, color: "var(--ink-3)" }}>결과 없음</div>}
          {groups.map((g) => (
            <div key={g || "_"}>
              {grouped && g && <div className="fgroup-label">{g}</div>}
              {shown.filter((o) => !grouped || (o.group ?? "") === g).map((o) => (
                <button key={o.value} className={"fopt" + (selected.includes(o.value) ? " sel" : "")} onClick={() => onToggle(o.value)}>
                  <span className="dot" />
                  {o.label ?? o.value}
                  <span className="n">{o.count}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FilterBar({ items, filters, setFilters, resultCount, title }: {
  items: Item[];
  filters: Filters;
  setFilters: (f: Filters) => void;
  resultCount: number;
  title: string;
}) {
  const toggle = (key: keyof Filters) => (v: string) => {
    const cur = filters[key] as string[];
    setFilters({ ...filters, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };

  const optIndustry = useMemo<Opt[]>(() => {
    const counts = countBy(items, (i) => [i.industry]);
    return [...counts.entries()]
      .map(([v, count]) => ({ value: v, count, group: items.find((i) => i.industry === v)?.category_group ?? "기타" }))
      .sort((a, b) => (a.group ?? "").localeCompare(b.group ?? "") || b.count - a.count);
  }, [items]);

  const optType = useMemo<Opt[]>(() =>
    [...countBy(items, (i) => i.content_type).entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count), [items]);

  const optTags = useMemo<Opt[]>(() =>
    [...countBy(items, (i) => tagsOf(i)).entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count), [items]);

  const optClient = useMemo<Opt[]>(() =>
    [...countBy(items, (i) => [i.client]).entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count), [items]);

  const optTeam = useMemo<Opt[]>(() =>
    [...countBy(items, (i) => [i.source_team]).entries()].map(([value, count]) => ({
      value, count, label: SOURCE_TEAM_LABELS[value as keyof typeof SOURCE_TEAM_LABELS] ?? value,
    })), [items]);

  const active = activeFilterCount(filters);
  const chips: { label: string; onX: () => void }[] = [
    ...filters.category_group.map((v) => ({ label: v, onX: () => toggle("category_group")(v) })),
    ...filters.industry.map((v) => ({ label: v, onX: () => toggle("industry")(v) })),
    ...filters.content_type.map((v) => ({ label: v, onX: () => toggle("content_type")(v) })),
    ...filters.tags.map((v) => ({ label: "#" + v, onX: () => toggle("tags")(v) })),
    ...filters.client.map((v) => ({ label: v, onX: () => toggle("client")(v) })),
    ...filters.source_team.map((v) => ({ label: v, onX: () => toggle("source_team")(v) })),
    ...(filters.bidding !== null ? [{ label: filters.bidding ? "비딩" : "실집행", onX: () => setFilters({ ...filters, bidding: null }) }] : []),
  ];

  return (
    <>
      <div className="filterbar">
        <div className="container filterbar-in">
          <Pill label="카테고리" opts={optIndustry} selected={filters.industry} onToggle={toggle("industry")} grouped />
          <Pill label="소재타입" opts={optType} selected={filters.content_type} onToggle={toggle("content_type")} />
          <Pill label="태그" opts={optTags} selected={filters.tags} onToggle={toggle("tags")} />
          <Pill label="광고주" opts={optClient} selected={filters.client} onToggle={toggle("client")} />
          <Pill label="제작소스" opts={optTeam} selected={filters.source_team} onToggle={toggle("source_team")} />
          <button
            className={"fpill" + (filters.bidding === true ? " on" : "")}
            onClick={() => setFilters({ ...filters, bidding: filters.bidding === true ? null : true })}>
            비딩
          </button>
          {active > 0 && (
            <button className="fpill" style={{ borderStyle: "dashed" }} onClick={() => setFilters({ ...emptyFilters, q: "" })}>
              초기화 ({active})
            </button>
          )}
        </div>
      </div>
      <div className="container count-line">
        <span className="k">{title}</span>
        <span className="v">{resultCount}</span>
        {chips.map((c, i) => (
          <button key={i} className="chip-x" onClick={c.onX}>{c.label} ✕</button>
        ))}
      </div>
    </>
  );
}
