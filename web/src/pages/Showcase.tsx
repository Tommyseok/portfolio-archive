import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Item } from "../types";
import type { Filters } from "../lib/filter";
import { applyFilters } from "../lib/filter";
import { FilterBar } from "../components/FilterBar";
import { WorkGrid } from "../components/WorkGrid";
import { CaseView } from "../components/CaseView";
import { useReveal } from "../lib/useReveal";
import devSample from "../lib/devSample.json"; // TEMP-DEV

/** 히어로 패널 3장 — Superside 스타일, 메시지당 이미지 하나 (원본 이미지 + 라이브 타이포) */
const PANELS: { img: string; objPos?: string; kicker: string; head: ReactNode; ko: ReactNode; en: string; ai?: boolean }[] = [
  {
    img: "/hero-ai.jpg", // 힉스필드 아웃페인트 — 좌측 초록 자연 확장, 모델 우측
    objPos: "60% 46%",
    kicker: "Creative Excellence",
    head: <><i>Emotional creative</i><br />from data</>,
    ko: <>소비자 마음을 움직이는 크리에이티브를,<br />데이터로 설계합니다.</>,
    en: "",
    ai: true,
  },
];

function HeroPanel({ p, first }: { p: (typeof PANELS)[number]; first?: boolean }) {
  const { ref, seen } = useReveal<HTMLElement>(0.25);
  return (
    <section ref={ref} className={"hpanel" + (first ? " hp-first" : "") + (seen ? " in" : "")}>
      <img className="hp-bg" src={p.img} alt="" style={p.objPos ? { objectPosition: p.objPos } : undefined} />
      {p.ai && (
        <span className="hp-ai">
          <span className="hp-ai-mark" aria-hidden="true"><i className="bar bar-h" /><i className="bar bar-v" /></span>
          <span className="hp-ai-txt">Made <i>with AI</i><b className="hp-ai-dot">.</b></span>
        </span>
      )}
      <div className="hp-content">
        <div className="hp-kicker">{p.kicker}</div>
        <h1 className="hp-head">{p.head}</h1>
        <p className="hp-ko">{p.ko}</p>
        {p.en && <p className="hp-en">{p.en}</p>}
      </div>
    </section>
  );
}

/** 쇼릴 히어로 — 앰비언트 무음 루프(저용량), 스크롤 확대, 클릭 시 사운드 플레이어 전환(고화질) */
const REEL_AMBIENT = "/showreel-lite.mp4"; // ~1.3Mbps 무음 — 느린 네트워크에서도 안 끊김
const REEL_FULL = "/showreel.mp4";         // 고화질 + 오디오 — 플레이어 모드 전용

function HeroReel() {
  const wrapRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // 모드 전환 시 소스·상태 구성 (src 는 render 에서 playing 값으로 바뀜)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.muted = false; v.controls = true; v.loop = false; v.currentTime = 0;
    } else {
      v.muted = true; v.controls = false; v.loop = true;
    }
    void v.play().catch(() => {});
  }, [playing]);

  // 리이 뷰포트로 들어오는 만큼 확대 (프레임 scale 0.76→1) — 진입 시 커지는 효과가 보이도록
  useEffect(() => {
    let raf = 0;
    const update = () => {
      const el = wrapRef.current;
      if (!el) return;
      const vh = window.innerHeight;
      const top = el.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, (vh - top) / (vh * 0.72)));
      el.style.setProperty("--reel-p", p.toFixed(4));
    };
    const onScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const enterPlayer = () => setPlaying(true);
  const exitPlayer = () => setPlaying(false);

  return (
    <section ref={wrapRef} className="reel-wrap">
      <div className="reel-frame">
        <video
          ref={videoRef}
          src={playing ? REEL_FULL : REEL_AMBIENT}
          poster="/showreel-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
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

/** 중간 카피 — 쇼릴과 그리드 사이 (Full-Stack Creative Service) */
function MiddleStatement() {
  const { ref, seen } = useReveal<HTMLElement>(0.3);
  return (
    <section ref={ref} className={"midstate" + (seen ? " in" : "")}>
      <div className="midstate-inner">
        <span className="midstate-eyebrow">02 — Our capability</span>
        <h2 className="midstate-title">Full-Stack<br />Creative Service<span className="midstate-dot">.</span></h2>
        <p className="midstate-body">
          실사 촬영부터 풀 AI까지, 배너부터 오프라인까지 —<br />
          표현에 <em>한계가 없는</em> 크리에이티브를 소개합니다.
        </p>
      </div>
    </section>
  );
}

/** 스탯 라인 — 패널·쇼릴 아래, 그리드 위 */
function StatsLine({ count, clients }: { count: number; clients: number }) {
  return (
    <div className="container" style={{ padding: "36px 28px 8px", fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-3)", letterSpacing: "0.05em" }}>
      {count} selected works · {clients} brands — 촬영 숏폼부터 생성형 AI 이미지·영상까지
    </div>
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
      {PANELS.map((p, i) => <HeroPanel key={p.img} p={p} first={i === 0} />)}

      <HeroReel />

      <MiddleStatement />

      <StatsLine count={pool.length} clients={clients} />

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
