import type { Item } from "../types";

const rankOf = (i: Item) => (i.featured_rank == null ? 999 : i.featured_rank);

/** Featured 풀에서 hero(1위) + tiles(2~5위)를 뽑는다. is_featured 만, rank 오름차순, 최대 5개. */
export function selectFeatured(items: Item[]): { hero: Item | null; tiles: Item[] } {
  const pool = items
    .filter((i) => i.is_featured)
    .sort((a, b) => rankOf(a) - rankOf(b))
    .slice(0, 5);
  return { hero: pool[0] ?? null, tiles: pool.slice(1, 5) };
}

/** 타일/히어로 커버 이미지 — 커버지정 > (구)featured_cover > 개별 크리에이티브 컷 > (최후) 슬라이드 캡처 */
export const coverOf = (i: Item): string | null =>
  i.cover_image || i.featured_cover || i.asset_images?.[0] || i.thumbnail || null;

/** 커버 포컬 위치 (object-position). 없으면 center */
export const coverPosOf = (i: Item): string => i.cover_position || "center";

/** 커버 확대 배율 (object-fit cover 위 추가 scale). 없으면 1 */
export const coverZoomOf = (i: Item): number => i.cover_zoom || 1;

/** 문제-해결 헤드라인 */
export const headlineOf = (i: Item): string =>
  i.featured_headline || i.custom_title || i.client;

/** 보조 카피 / 히어로 리드 */
export const subcopyOf = (i: Item): string => i.featured_subcopy || "";

/** 히어로 키커 */
export const kickerOf = (i: Item): string =>
  i.featured_kicker || `Featured Case Study · ${i.client}`;
