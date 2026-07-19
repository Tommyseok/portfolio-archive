import { describe, it, expect } from "vitest";
import { selectFeatured, coverOf, headlineOf, subcopyOf, kickerOf } from "../src/lib/featured";
import type { Item } from "../src/types";

const it_ = (over: Partial<Item>): Item => ({
  id: "x", source_team: "PD", source_slide_id: "g", client: "메디힐", client_raw: "메디힐",
  client_matched: true, industry: "뷰티", category_group: "소비재", advertiser_type: "브랜드/서비스",
  advertiser_status: "confirmed", is_bidding: false, title: "선케어", overview: "o", year_month: "2026-04",
  media_type: "Video production", format: "Short form", content_type: [], production_team: "PD",
  production_method: "실촬영", tools: [], team: null, video_urls: [], asset_images: [], thumbnail: "t",
  ai_used: false, period_start: null, period_end: null, in_house: true, piece_count: 1,
  appeal_points: [], keywords: [], search_summary: "s", ai_confidence: null,
  custom_description: null, custom_tags: [], extra_images: [], creators: [],
  showcase_approved: true, updated_by: null, ...over,
});

describe("selectFeatured", () => {
  it("is_featured 만, rank 오름차순, hero=1위, tiles=2~5위", () => {
    const items = [
      it_({ id: "a", is_featured: true, featured_rank: 3 }),
      it_({ id: "b", is_featured: false, featured_rank: 1 }),
      it_({ id: "c", is_featured: true, featured_rank: 1 }),
      it_({ id: "d", is_featured: true, featured_rank: 2 }),
    ];
    const r = selectFeatured(items);
    expect(r.hero?.id).toBe("c");
    expect(r.tiles.map((i) => i.id)).toEqual(["d", "a"]);
  });
  it("6개 이상이면 상위 5개만(hero1+tiles4)", () => {
    const items = Array.from({ length: 7 }, (_, i) => it_({ id: String(i), is_featured: true, featured_rank: i + 1 }));
    const r = selectFeatured(items);
    expect(r.hero?.id).toBe("0");
    expect(r.tiles.map((i) => i.id)).toEqual(["1", "2", "3", "4"]);
  });
  it("featured 0개면 hero=null, tiles=[]", () => {
    expect(selectFeatured([it_({})])).toEqual({ hero: null, tiles: [] });
  });
  it("rank null 은 뒤로 밀림", () => {
    const items = [
      it_({ id: "a", is_featured: true, featured_rank: null }),
      it_({ id: "b", is_featured: true, featured_rank: 1 }),
    ];
    expect(selectFeatured(items).hero?.id).toBe("b");
  });
});

describe("폴백 헬퍼", () => {
  it("coverOf: featured_cover → asset_images[0] → thumbnail (개별 컷이 슬라이드보다 우선)", () => {
    expect(coverOf(it_({ featured_cover: "fc" }))).toBe("fc");
    expect(coverOf(it_({ featured_cover: null, thumbnail: "th", asset_images: ["a0"] }))).toBe("a0");
    expect(coverOf(it_({ featured_cover: null, thumbnail: "th", asset_images: [] }))).toBe("th");
    expect(coverOf(it_({ featured_cover: null, thumbnail: null, asset_images: ["a0"] }))).toBe("a0");
    expect(coverOf(it_({ featured_cover: null, thumbnail: null, asset_images: [] }))).toBe(null);
  });
  it("headlineOf: featured_headline → custom_title → client", () => {
    expect(headlineOf(it_({ featured_headline: "H" }))).toBe("H");
    expect(headlineOf(it_({ featured_headline: null, custom_title: "CT" }))).toBe("CT");
    expect(headlineOf(it_({ featured_headline: null, custom_title: null, client: "메디힐" }))).toBe("메디힐");
  });
  it("subcopyOf: featured_subcopy → 빈문자열", () => {
    expect(subcopyOf(it_({ featured_subcopy: "S" }))).toBe("S");
    expect(subcopyOf(it_({ featured_subcopy: null }))).toBe("");
  });
  it("kickerOf: featured_kicker → 자동생성", () => {
    expect(kickerOf(it_({ featured_kicker: "K" }))).toBe("K");
    expect(kickerOf(it_({ featured_kicker: null, client: "메디힐" }))).toBe("Featured Case Study · 메디힐");
  });
});
