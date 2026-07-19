import type { Item } from "../types";

export interface DetailLink { label: string; url: string; }

export const detailTitle = (i: Item): string => i.custom_title || i.client;

export const detailSubtitle = (i: Item): string =>
  [i.media_type, i.format].filter(Boolean).join(", ");

export const detailDesc = (i: Item): string =>
  i.custom_description || i.overview || i.search_summary || "";

export const detailGallery = (i: Item): string[] => {
  const g = [...(i.asset_images ?? []), ...(i.extra_images ?? [])];
  if (g.length === 0 && i.thumbnail) g.push(i.thumbnail);
  return g;
};

export const detailLinks = (i: Item): DetailLink[] => {
  if (i.custom_links && i.custom_links.length > 0) return i.custom_links;
  const v = i.video_urls ?? [];
  return v.map((url, n) => ({ label: v.length > 1 ? `영상 보기 ${n + 1}` : "영상 보기", url }));
};
