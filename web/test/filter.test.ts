import { describe, it, expect } from "vitest";
import { applyFilters, keywordMatch, type Filters } from "../src/lib/filter";
import type { PublicPortfolioItem } from "../src/types";

const item = (over: Partial<PublicPortfolioItem>): PublicPortfolioItem => ({
  id: "1", source_slide_id: "g1", client: "메디힐", project_title: "선케어", overview: "양현종 메이킹",
  period_start: "2026-03-12", period_end: "2026-04-06", year_month: "2026-04",
  in_house: true, piece_count: 1, content_type: ["촬영숏폼"], ai_used: false,
  video_url: "u", thumbnail: "t", industry: "뷰티",
  platform: ["인스타그램"], campaign_objective: ["신제품론칭"],
  target_audience: ["2030여성"], production_type: ["실사촬영"], visual_mood: ["감성/따뜻한"],
  keywords: ["선케어", "양현종"], search_summary: "선케어 메이킹", _ai_confidence: "estimated",
  ...over,
});
const empty: Filters = { industry: [], platform: [], campaign_objective: [], target_audience: [], production_type: [], visual_mood: [], content_type: [], ai_used: null, year_month: [], client: [] };

describe("applyFilters", () => {
  it("빈 필터는 전부 통과", () => {
    const items = [item({}), item({ id: "2", industry: "식품/음료" })];
    expect(applyFilters(items, empty)).toHaveLength(2);
  });
  it("업종 필터", () => {
    const items = [item({}), item({ id: "2", industry: "식품/음료" })];
    expect(applyFilters(items, { ...empty, industry: ["뷰티"] })).toHaveLength(1);
  });
  it("AI활용 필터", () => {
    const items = [item({ ai_used: true }), item({ id: "2", ai_used: false })];
    expect(applyFilters(items, { ...empty, ai_used: true })).toHaveLength(1);
  });
  it("매체 필터", () => {
    const items = [item({}), item({ id: "2", platform: ["유튜브"] })];
    expect(applyFilters(items, { ...empty, platform: ["인스타그램"] })).toHaveLength(1);
  });
  it("캠페인목적 필터", () => {
    const items = [item({}), item({ id: "2", campaign_objective: ["브랜드인지"] })];
    expect(applyFilters(items, { ...empty, campaign_objective: ["신제품론칭"] })).toHaveLength(1);
  });
  it("타겟·제작방식·광고주·월 다중선택(OR within group)", () => {
    const items = [item({}), item({ id: "2", industry: "식품/음료", target_audience: ["MZ세대(1020)"], client: "CJ", year_month: "2025-01" })];
    expect(applyFilters(items, { ...empty, target_audience: ["2030여성", "MZ세대(1020)"] })).toHaveLength(2);
    expect(applyFilters(items, { ...empty, client: ["CJ"] })).toHaveLength(1);
    expect(applyFilters(items, { ...empty, year_month: ["2026-04"] })).toHaveLength(1);
  });
});

describe("keywordMatch", () => {
  it("키워드/개요/광고주에서 부분일치(모든 단어 AND)", () => {
    expect(keywordMatch(item({}), "양현종")).toBe(true);
    expect(keywordMatch(item({}), "세무")).toBe(false);
    expect(keywordMatch(item({}), "메디힐 선케어")).toBe(true);
    expect(keywordMatch(item({}), "")).toBe(true);
  });
  it("매체/캠페인목적도 키워드 매칭", () => {
    expect(keywordMatch(item({}), "인스타그램")).toBe(true);
    expect(keywordMatch(item({}), "신제품론칭")).toBe(true);
  });
});
