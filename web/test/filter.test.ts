import { describe, it, expect } from "vitest";
import { applyFilters, keywordMatch, emptyFilters } from "../src/lib/filter";
import type { Item } from "../src/types";
import { tagsOf } from "../src/types";

const item = (over: Partial<Item>): Item => ({
  id: "1", source_team: "PD", source_slide_id: "g1",
  client: "메디힐", client_raw: "메디힐", client_matched: true,
  industry: "뷰티", category_group: "소비재", advertiser_type: "브랜드/서비스",
  advertiser_status: "confirmed", is_bidding: false,
  title: "선케어", overview: "양현종 메이킹", year_month: "2026-04",
  media_type: "Video production", format: "Short form",
  content_type: ["촬영숏폼"], tools: [], team: null,
  video_urls: ["u"], asset_images: [], thumbnail: "t", ai_used: false,
  period_start: null, period_end: null, in_house: true, piece_count: 1,
  appeal_points: ["감성/브랜드"], keywords: ["선케어", "양현종"],
  search_summary: "선케어 메이킹", ai_confidence: "estimated",
  custom_description: null, custom_tags: [], extra_images: [], creators: [],
  showcase_approved: false, updated_by: null,
  ...over,
});

describe("tagsOf", () => {
  it("AI 소구 + 수기 태그 합집합 (중복 제거)", () => {
    expect(tagsOf(item({ custom_tags: ["아마존", "감성/브랜드"] }))).toEqual(["감성/브랜드", "아마존"]);
  });
});

describe("applyFilters", () => {
  it("빈 필터는 전부 통과", () => {
    expect(applyFilters([item({}), item({ id: "2" })], emptyFilters)).toHaveLength(2);
  });
  it("카테고리(업종)·대분류 필터", () => {
    const items = [item({}), item({ id: "2", industry: "금융/핀테크", category_group: "금융·서비스" })];
    expect(applyFilters(items, { ...emptyFilters, industry: ["뷰티"] })).toHaveLength(1);
    expect(applyFilters(items, { ...emptyFilters, category_group: ["금융·서비스"] })).toHaveLength(1);
  });
  it("태그 필터는 수기 태그도 잡는다", () => {
    const items = [item({}), item({ id: "2", custom_tags: ["아마존"] })];
    expect(applyFilters(items, { ...emptyFilters, tags: ["아마존"] })).toHaveLength(1);
  });
  it("소재타입 2단 + 태그 + 카테고리 조합 (뷰티×숏폼×감성)", () => {
    const items = [
      item({}),
      item({ id: "2", media_type: "Static design", format: "Banner" }),
      item({ id: "3", industry: "금융/핀테크" }),
    ];
    const r = applyFilters(items, { ...emptyFilters, industry: ["뷰티"], format: ["Video production>Short form"], tags: ["감성/브랜드"] });
    expect(r.map((i) => i.id)).toEqual(["1"]);
    expect(applyFilters(items, { ...emptyFilters, format: ["Static design>Banner"] }).map((i) => i.id)).toEqual(["2"]);
  });
  it("자유 텍스트 q 는 필터와 AND 결합", () => {
    const items = [item({}), item({ id: "2", overview: "아마존 프로모션" })];
    expect(applyFilters(items, { ...emptyFilters, q: "메디힐 아마존" })).toHaveLength(1);
  });
  it("비딩 tri-state", () => {
    const items = [item({ is_bidding: true }), item({ id: "2" })];
    expect(applyFilters(items, { ...emptyFilters, bidding: true })).toHaveLength(1);
    expect(applyFilters(items, { ...emptyFilters, bidding: null })).toHaveLength(2);
  });
});

describe("keywordMatch", () => {
  it("설명·크리에이터·수기태그에서도 매칭", () => {
    expect(keywordMatch(item({ custom_description: "아마존 프라임데이 프로모션" }), "프라임데이")).toBe(true);
    expect(keywordMatch(item({ creators: ["김제작"] }), "김제작")).toBe(true);
    expect(keywordMatch(item({}), "없는말")).toBe(false);
  });
});
