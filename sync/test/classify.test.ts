import { describe, it, expect } from "vitest";
import { buildClassifyPrompt, parseClassifyResponse } from "../src/classify.js";
import type { ParsedFields } from "../src/types.js";

function makeParsed(over?: Partial<ParsedFields>): ParsedFields {
  return {
    client: "메디힐",
    project_title: "선케어 캠페인 영상(6)",
    overview: "선세럼 모델 촬영 메이킹필름 제작",
    period_start: "2026-01-30",
    period_end: "2026-03-14",
    year_month: "2026-03",
    in_house: true,
    piece_count: 6,
    billing_amount: 2500000,
    content_type: ["촬영숏폼"],
    ai_used: false,
    video_url: null,
    thumbnail: null,
    ...over,
  };
}

describe("buildClassifyPrompt", () => {
  it("광고주/프로젝트/개요 텍스트를 포함한다", () => {
    const prompt = buildClassifyPrompt(makeParsed({ client: "메디힐" }));
    expect(prompt).toContain("메디힐");
    expect(prompt).toContain("선케어 캠페인 영상(6)");
    expect(prompt).toContain("선세럼 모델 촬영 메이킹필름 제작");
  });

  it("AE 세일즈 라벨 항목(매체/캠페인목적/타겟)을 포함한다", () => {
    const prompt = buildClassifyPrompt(makeParsed());
    expect(prompt).toContain("유튜브");
    expect(prompt).toContain("신제품론칭");
    expect(prompt).toContain("MZ세대");
    expect(prompt).toContain("뷰티");
  });
});

describe("parseClassifyResponse", () => {
  it("새 AE 필드 스키마를 파싱한다", () => {
    const text = '```json\n{"industry":"뷰티","platform":["인스타그램"],"campaign_objective":["신제품론칭"],"target_audience":["2030여성"],"production_type":["실사촬영"],"visual_mood":["감성/따뜻한"],"keywords":["선케어"],"search_summary":"선세럼 신제품 인스타 광고"}\n```';
    const ai = parseClassifyResponse(text);
    expect(ai.industry).toBe("뷰티");
    expect(ai.platform).toEqual(["인스타그램"]);
    expect(ai.campaign_objective).toEqual(["신제품론칭"]);
    expect(ai.target_audience).toEqual(["2030여성"]);
    expect(ai.production_type).toEqual(["실사촬영"]);
    expect(ai.visual_mood).toEqual(["감성/따뜻한"]);
    expect(ai.keywords).toEqual(["선케어"]);
    expect(ai.search_summary).toBe("선세럼 신제품 인스타 광고");
    expect(ai._ai_confidence).toBe("estimated");
  });

  it("펜스 없는 순수 JSON 입력도 동작한다", () => {
    const text = '{"industry":"식품/음료","platform":["유튜브"],"campaign_objective":["브랜드인지"],"target_audience":["전연령"],"production_type":["모션그래픽"],"visual_mood":["유머러스"],"keywords":["간편식"],"search_summary":"식품 요약"}';
    const ai = parseClassifyResponse(text);
    expect(ai.industry).toBe("식품/음료");
    expect(ai.platform).toEqual(["유튜브"]);
    expect(ai._ai_confidence).toBe("estimated");
  });

  it("주변 산문이 있어도 JSON 객체를 추출한다", () => {
    const text = '분류 결과:\n```json\n{"industry":"헬스케어/제약","platform":["TV/OTT"],"campaign_objective":["브랜드인지"],"target_audience":["4050이상"],"production_type":["실사촬영"],"visual_mood":["세련된/럭셔리"],"keywords":["건강"],"search_summary":"헬스 요약"}\n```';
    const ai = parseClassifyResponse(text);
    expect(ai.industry).toBe("헬스케어/제약");
    expect(ai.platform).toEqual(["TV/OTT"]);
  });

  it("누락 필드는 안전하게 기본값으로 채운다", () => {
    const text = '{"search_summary":"부분 응답"}';
    const ai = parseClassifyResponse(text);
    expect(ai.industry).toBe("기타");
    expect(ai.platform).toEqual([]);
    expect(ai.campaign_objective).toEqual([]);
    expect(ai.target_audience).toEqual([]);
    expect(ai.production_type).toEqual([]);
    expect(ai.visual_mood).toEqual([]);
    expect(ai.keywords).toEqual([]);
    expect(ai.search_summary).toBe("부분 응답");
    expect(ai._ai_confidence).toBe("estimated");
  });

  it("JSON 이 전혀 없으면 에러를 던진다", () => {
    expect(() => parseClassifyResponse("그냥 평범한 텍스트입니다")).toThrow();
  });
});
