import { describe, it, expect } from "vitest";
import { buildClassifyPrompt, parseClassifyResponse } from "../src/classify.js";

const input = {
  client: "메디힐",
  title: "선케어 캠페인 영상(6)",
  overview: "선세럼 모델 촬영 메이킹필름 제작",
};

describe("buildClassifyPrompt", () => {
  it("광고주/제목/설명 텍스트를 포함한다", () => {
    const prompt = buildClassifyPrompt(input);
    expect(prompt).toContain("메디힐");
    expect(prompt).toContain("선케어 캠페인 영상(6)");
    expect(prompt).toContain("선세럼 모델 촬영 메이킹필름 제작");
  });

  it("소구포인트 통제 어휘를 포함하고 '기타'는 선택지 나열에서 제외한다", () => {
    const prompt = buildClassifyPrompt(input);
    expect(prompt).toContain("후기/추천");
    expect(prompt).toContain("감성/브랜드");
    expect(prompt).toContain("유머/밈");
    expect(prompt).not.toContain("기타, ");
  });
});

describe("parseClassifyResponse", () => {
  it("소구포인트 스키마를 파싱한다", () => {
    const text = '```json\n{"appeal_points":["감성/브랜드","제품/효능"],"keywords":["선케어","메이킹"],"search_summary":"선세럼 메이킹필름"}\n```';
    const ai = parseClassifyResponse(text);
    expect(ai.appeal_points).toEqual(["감성/브랜드", "제품/효능"]);
    expect(ai.keywords).toEqual(["선케어", "메이킹"]);
    expect(ai.search_summary).toBe("선세럼 메이킹필름");
    expect(ai._ai_confidence).toBe("estimated");
  });

  it("어휘 밖 소구는 걸러내고, 비면 '기타'로 대체한다", () => {
    const ai = parseClassifyResponse('{"appeal_points":["긴급/희소"],"keywords":[],"search_summary":""}');
    expect(ai.appeal_points).toEqual(["기타"]);
  });

  it("3개 이상 오면 앞의 2개만 취한다", () => {
    const ai = parseClassifyResponse('{"appeal_points":["공감","후기/추천","유머/밈"],"keywords":[],"search_summary":""}');
    expect(ai.appeal_points).toEqual(["공감", "후기/추천"]);
  });

  it("누락 필드는 안전하게 기본값으로 채운다", () => {
    const ai = parseClassifyResponse('{"search_summary":"부분 응답"}');
    expect(ai.appeal_points).toEqual(["기타"]);
    expect(ai.keywords).toEqual([]);
  });

  it("JSON 이 전혀 없으면 에러를 던진다", () => {
    expect(() => parseClassifyResponse("그냥 평범한 텍스트입니다")).toThrow();
  });
});
