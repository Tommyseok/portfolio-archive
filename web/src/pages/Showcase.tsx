import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Item } from "../types";
import type { Filters } from "../lib/filter";
import { applyFilters } from "../lib/filter";
import { FilterBar } from "../components/FilterBar";
import { WorkGrid } from "../components/WorkGrid";
import { CaseView } from "../components/CaseView";
import { useReveal } from "../lib/useReveal";
import devSample from "../lib/devSample.json"; // TEMP-DEV

const HEADLINE =
  "We help Korea's leading brands create standout ads and campaigns at speed—from concept to execution to results.";

/** 쇼릴 히어로 — 앰비언트 무음 루프, 스크롤 확대, 클릭 시 사운드 플레이어 전환 */
function HeroReel() {
  const wrapRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // 스크롤 진행도 0→1 을 CSS 변수로 (프레임 scale 0.9→1)
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const p = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.4)));
      wrapRef.current?.style.setProperty("--reel-p", p.toFixed(4));
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  /** 앰비언트(무음 루프) → 플레이어(사운드 + 네이티브 플레이바) */
  const enterPlayer = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.controls = true;
    v.loop = false;
    v.currentTime = 0;
    void v.play();
    setPlaying(true);
  };
  /** 재생 종료 시 다시 앰비언트로 */
  const exitPlayer = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.controls = false;
    v.loop = true;
    void v.play();
    setPlaying(false);
  };

  return (
    <section ref={wrapRef} className="reel-wrap">
      <div className="reel-frame">
        <video
          ref={videoRef}
          src="/showreel.mp4"
          poster="/showreel-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onEnded={exitPlayer}
        />
        {!playing && (
          <div className="reel-cover" onClick={enterPlayer}>
            <span className="reel-tag">2026 madup showreel</span>
            <button className="reel-play" aria-label="사운드와 함께 재생">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 3.8v16.4c0 .9 1 1.5 1.8 1L21 12.9c.7-.5.7-1.4 0-1.9L7.8 2.9C7 2.4 6 3 6 3.8Z" /></svg>
            </button>
            <button className="reel-sound" aria-label="사운드 켜기">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 4.5 7 8.8H3.8v6.4H7l5 4.3V4.5Z" fill="currentColor" stroke="none" />
                <path className="wv" d="M15.5 9.2a4.4 4.4 0 0 1 0 5.6" />
                <path className="wv wv2" d="M18.4 6.8a8.2 8.2 0 0 1 0 10.4" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

/** 워드 단위 스태거 리빌 헤드라인 */
function Statement({ count, clients }: { count: number; clients: number }) {
  const { ref, seen } = useReveal<HTMLElement>(0.3);
  const words = HEADLINE.split(" ");
  return (
    <section ref={ref} className={"statement" + (seen ? " in" : "")}>
      <h1>
        {words.map((w, i) => (
          <span key={i}>
            <span className="w" style={{ "--i": i } as CSSProperties}>
              {w === "standout" ? <em>{w}</em> : w}
            </span>{" "}
          </span>
        ))}
      </h1>
      <div className="sub">
        {count} selected works · {clients} brands — 촬영 숏폼부터 생성형 AI 이미지·영상까지
      </div>
    </section>
  );
}

export function Showcase({ items, loading, filters, setFilters, staff }: {
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
  // TEMP-DEV: 승인 0건일 때 로컬 미리보기용 샘플 — 검증 후 제거
  const pool = useMemo(() => {
    const p = items.filter((i) => i.showcase_approved);
    if (p.length === 0 && import.meta.env.DEV) return devSample as unknown as Item[];
    return p;
  }, [items]);
  const filtered = useMemo(() => applyFilters(pool, filters), [pool, filters]);
  const clients = new Set(pool.map((i) => i.client)).size;

  return (
    <>
      <HeroReel />

      <Statement count={pool.length} clients={clients} />

      {!loading && pool.length === 0 ? (
        <div className="container empty">
          <div className="big">Coming soon</div>
          <p>공개 승인된 소재가 준비되는 대로 이곳에 전시됩니다.{staff ? " — Explore에서 소재를 열어 'Showcase 외부 공개'를 켜면 나타납니다." : ""}</p>
        </div>
      ) : (
        <>
          <FilterBar items={pool} filters={filters} setFilters={setFilters} resultCount={filtered.length} title="Selected work" />
          <WorkGrid items={filtered} onOpen={setOpen} loading={loading} />
        </>
      )}
      <CaseView item={open} onClose={() => setOpen(null)} />
    </>
  );
}
