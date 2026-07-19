import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { Item } from "../types";
import type { Filters } from "../lib/filter";
import { applyFilters } from "../lib/filter";
import { FilterBar } from "../components/FilterBar";
import { ItemGrid } from "../components/ItemGrid";
import { DetailView } from "../components/DetailView";
import { LoginGate } from "../components/LoginGate";
import { useSocial, toggleLike, togglePublish, createItem } from "../lib/useData";
import devSample from "../lib/devSample.json"; // TEMP-DEV

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
  const { social, reloadSocial } = useSocial([email ?? "anon"]);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [nc, setNc] = useState(""); // 새 항목 광고주명
  const [nt, setNt] = useState(""); // 새 항목 제목

  const doCreate = async () => {
    if (!email || !nc.trim()) return;
    setBusy(true);
    try {
      const it = await createItem({ client: nc, title: nt }, email);
      setCreating(false); setNc(""); setNt("");
      onSaved();        // 그리드 새로고침 (Explore 반영)
      setOpen(it);      // 새 항목을 바로 편집 모달로 열기
    } catch (e) { window.alert(String((e as Error).message)); }
    setBusy(false);
  };

  /** 좋아요 토글 — 즉시 반영 후 서버 동기화 */
  const handleLike = (it: Item) => {
    if (!email) return;
    const liked = (social.likes[it.id] ?? []).includes(email);
    void toggleLike(it.id, email, liked).then(reloadSocial).catch(reloadSocial);
  };

  /** 공개 토글 — 전환 이력은 DB 트리거가 자동 기록 */
  const handlePublish = (it: Item) => {
    if (!email) return;
    if (!it.showcase_approved && !window.confirm(`'${it.client} — ${it.title}'\n외부 Showcase에 공개할까요? (누가 공개했는지 기록됩니다)`)) return;
    void togglePublish(it, email).then(onSaved);
  };

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
        production_team: team ? [team] : filters.production_team,
        team: subteam ? [subteam] : filters.team,
        q: creator ?? filters.q,
      });
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // TEMP-DEV: 로그인 없는 로컬 dev 에서 UI 확인용 샘플 (프로덕션 번들에선 제거됨)
  const devPreview = import.meta.env.DEV && ready && !staff;
  const pool = devPreview ? (devSample as unknown as Item[]) : items;
  const filtered = useMemo(() => applyFilters(pool, filters), [pool, filters]);

  if (!ready) return <div className="container grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skel" />)}</div>;
  if (!staff && !devPreview) return <LoginGate />;

  return (
    <>
      <FilterBar items={pool} filters={filters} setFilters={setFilters} resultCount={filtered.length} title="Explore"
        rightSlot={staff ? (
          !creating ? (
            <button className="fpill" onClick={() => setCreating(true)}>+ 새 항목 만들기</button>
          ) : (
            <>
              <input className="input" placeholder="광고주 / 브랜드명" value={nc} onChange={(e) => setNc(e.target.value)} style={{ maxWidth: 160, height: 34 }} autoFocus />
              <input className="input" placeholder="제목 (선택)" value={nt} onChange={(e) => setNt(e.target.value)} style={{ maxWidth: 190, height: 34 }}
                onKeyDown={(e) => { if (e.key === "Enter" && nc.trim()) void doCreate(); }} />
              <button className="fpill on" onClick={() => void doCreate()} disabled={busy || !nc.trim()}>{busy ? "생성 중…" : "만들기"}</button>
              <button className="fpill" onClick={() => { setCreating(false); setNc(""); setNt(""); }}>취소</button>
            </>
          )
        ) : undefined} />
      <ItemGrid items={filtered} onOpen={setOpen} staff={staff} loading={loading}
        email={email} social={social} onToggleLike={handleLike} onTogglePublish={handlePublish} />
      <DetailView item={open} onClose={() => setOpen(null)} staff={staff} email={email}
        onSaved={() => { onSaved(); setOpen(null); }}
        likers={open ? social.likes[open.id] ?? [] : []}
        onToggleLike={handleLike}
        onSocialChanged={() => void reloadSocial()} />
    </>
  );
}
