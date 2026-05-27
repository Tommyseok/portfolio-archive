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

  it("통제 어휘(포맷/업종) 용어를 포함한다", () => {
    const prompt = buildClassifyPrompt(makeParsed());
    // FORMATS 의 한 항목
    expect(prompt).toContain("인터뷰형");
    // INDUSTRIES 의 한 항목
    expect(prompt).toContain("뷰티");
  });
});

describe("parseClassifyResponse", () => {
  it("```json 펜스로 감싼 응답에서 필드를 추출한다", () => {
    const text =
      '```json\n{"industry":"뷰티","format_concept":["메이킹필름"],"mood":["감성"],"keywords":["선케어"],"search_summary":"요약"}\n```';
    const ai = parseClassifyResponse(text);
    expect(ai.industry).toBe("뷰티");
    expect(ai.format_concept).toEqual(["메이킹필름"]);
    expect(ai.mood).toEqual(["감성"]);
    expect(ai.keywords).toEqual(["선케어"]);
    expect(ai.search_summary).toBe("요약");
    expect(ai._ai_confidence).toBe("estimated");
  });

  it("펜스 없는 순수 JSON 입력도 동작한다", () => {
    const text =
      '{"industry":"식품","format_concept":["제품소개형"],"mood":["정보전달"],"keywords":["간편식"],"search_summary":"식품 요약"}';
    const ai = parseClassifyResponse(text);
    expect(ai.industry).toBe("식품");
    expect(ai.format_concept).toEqual(["제품소개형"]);
    expect(ai._ai_confidence).toBe("estimated");
  });

  it("주변 산문이 있어도 JSON 객체를 추출한다", () => {
    const text =
      '분류 결과는 다음과 같습니다.\n```json\n{"industry":"헬스케어","format_concept":["인터뷰형"],"mood":["진정성"],"keywords":["건강"],"search_summary":"헬스 요약"}\n```\n이상입니다.';
    const ai = parseClassifyResponse(text);
    expect(ai.industry).toBe("헬스케어");
    expect(ai.format_concept).toEqual(["인터뷰형"]);
  });

  it("누락 필드는 안전하게 기본값으로 채운다", () => {
    const text = '{"search_summary":"부분 응답"}';
    const ai = parseClassifyResponse(text);
    expect(ai.industry).toBe("기타");
    expect(ai.format_concept).toEqual([]);
    expect(ai.mood).toEqual([]);
    expect(ai.keywords).toEqual([]);
    expect(ai.search_summary).toBe("부분 응답");
    expect(ai._ai_confidence).toBe("estimated");
  });

  it("JSON 이 전혀 없으면 에러를 던진다", () => {
    expect(() => parseClassifyResponse("그냥 평범한 텍스트입니다")).toThrow();
  });
});
