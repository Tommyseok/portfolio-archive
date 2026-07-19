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

/** 타일/히어로 커버 이미지 */
export const coverOf = (i: Item): string | null =>
  i.featured_cover || i.thumbnail || i.asset_images?.[0] || null;

/** 문제-해결 헤드라인 */
export const headlineOf = (i: Item): string =>
  i.featured_headline || i.custom_title || i.client;

/** 보조 카피 / 히어로 리드 */
export const subcopyOf = (i: Item): string => i.featured_subcopy || "";

/** 히어로 키커 */
export const kickerOf = (i: Item): string =>
  i.featured_kicker || `Featured Case Study · ${i.client}`;
