import type { Item } from "../types";
import type { CSSProperties } from "react";
import { selectFeatured, coverOf, coverPosOf, coverZoomOf, cardShowsVideo, headlineOf, subcopyOf, kickerOf } from "../lib/featured";

/** 헤드라인 문자열의 *별표* 를 세리프 이탤릭으로 렌더 (예: "촬영 없이 *40종*") */
function Emph({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return <>{parts.map((p, i) => (i % 2 === 1 ? <i key={i}>{p}</i> : <span key={i}>{p}</span>))}</>;
}

function imgStyle(item: Item): CSSProperties {
  const src = coverOf(item);
  const s: Record<string, string | number> = {
    backgroundPosition: coverPosOf(item),
    transformOrigin: coverPosOf(item),
    "--cz": coverZoomOf(item),
  };
  if (src) s.backgroundImage = `url(${src})`;
  else s.background = "radial-gradient(120% 120% at 60% 30%,#33434e,#0c1419)";
  return s as unknown as CSSProperties;
}

/** 커버 미디어 — cover_video 있으면 자동재생 영상, 없으면 이미지 배경 */
function CoverMedia({ item }: { item: Item }) {
  if (cardShowsVideo(item)) {
    const vs = { objectPosition: coverPosOf(item), transformOrigin: coverPosOf(item), "--cz": coverZoomOf(item) } as unknown as CSSProperties;
    return (
      <video className="img" autoPlay muted loop playsInline preload="metadata"
        poster={coverOf(item) ?? undefined} style={vs}>
        <source src={item.cover_video ?? undefined} />
      </video>
    );
  }
  return <div className="img" style={imgStyle(item)} />;
}

function Hero({ item, onOpen }: { item: Item; onOpen: (i: Item) => void }) {
  return (
    <div className="fh" onClick={() => onOpen(item)}>
      <CoverMedia item={item} />
      <div className="scrim" />
      <div className="in">
        <div className="kicker">{kickerOf(item)}</div>
        <h3><Emph text={headlineOf(item)} /></h3>
        {subcopyOf(item) && <p className="lead">{subcopyOf(item)}</p>}
      </div>
    </div>
  );
}

function Tile({ item, cls, onOpen }: { item: Item; cls: string; onOpen: (i: Item) => void }) {
  return (
    <div className={"ft " + cls} onClick={() => onOpen(item)}>
      <CoverMedia item={item} />
      <div className="scrim" />
      <div className="txt">
        <h4><Emph text={headlineOf(item)} /></h4>
        {subcopyOf(item) && <p>{subcopyOf(item)}</p>}
      </div>
      <div className="ft-adv">{item.client}<span className="plus">+</span></div>
    </div>
  );
}

/** 대분류 표시: 좌열 스택(c1 위, c4 아래) + 중앙 c2(big) + 우 c3(big) */
const TILE_CLS = ["c1", "c2 big", "c3 big", "c4"];

export function FeaturedSection({ items, onOpen }: { items: Item[]; onOpen: (i: Item) => void }) {
  const { hero, tiles } = selectFeatured(items);
  if (!hero) return null;

  return (
    <section className="container featured">
      <div className="featured-eyebrow">
        <span className="t">Featured Case Studies</span>
        <span className="rule" />
      </div>
      <Hero item={hero} onOpen={onOpen} />
      {tiles.length > 0 && (
        <div className="ftiles">
          {tiles.map((t, i) => <Tile key={t.id} item={t} cls={TILE_CLS[i]} onOpen={onOpen} />)}
        </div>
      )}
    </section>
  );
}
