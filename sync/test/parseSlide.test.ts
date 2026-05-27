import { describe, it, expect } from "vitest";
import { isProjectSlide, parseSlide } from "../src/parseSlide.js";
import fixture from "./fixtures/sample-presentation.json" with { type: "json" };

// 합성 슬라이드 빌더: 텍스트 줄들 -> shape 텍스트 엘리먼트, 옵션으로 image 링크
function makeSlide(lines: string[], opts?: { link?: string }) {
  const pageElements: any[] = [
    {
      objectId: "shape1",
      shape: {
        text: {
          textElements: lines.map((l) => ({ textRun: { content: l + "\n" } })),
        },
      },
    },
  ];
  if (opts?.link) {
    pageElements.push({
      objectId: "img1",
      image: { imageProperties: { link: { url: opts.link } } },
    });
  }
  return { objectId: "slide1", pageElements };
}

describe("isProjectSlide", () => {
  it("광고주: 가 있으면 프로젝트 슬라이드", () => {
    expect(isProjectSlide(makeSlide(["광고주: 메디힐"]))).toBe(true);
  });
  it("광고주가 없으면 프로젝트 슬라이드 아님", () => {
    expect(isProjectSlide(makeSlide(["목차", "회사 소개"]))).toBe(false);
  });
});

describe("parseSlide", () => {
  it("광고주/프로젝트/개요를 추출한다", () => {
    const s = makeSlide([
      "광고주: 메디힐",
      "프로젝트: 선케어 캠페인 영상(6)",
      "프로젝트 개요: 선세럼 모델 촬영 메이킹필름 제작",
    ]);
    const p = parseSlide(s);
    expect(p.client).toBe("메디힐");
    expect(p.project_title).toBe("선케어 캠페인 영상(6)");
    expect(p.overview).toBe("선세럼 모델 촬영 메이킹필름 제작");
  });

  it("프로젝트 추출이 '프로젝트 개요'를 잘못 잡지 않는다", () => {
    const s = makeSlide([
      "광고주: A사",
      "프로젝트: 진짜 제목",
      "프로젝트 개요: 잘못된 개요 줄",
    ]);
    expect(parseSlide(s).project_title).toBe("진짜 제목");
  });

  it("제작 기간을 파싱한다 (start/end/year_month)", () => {
    const s = makeSlide([
      "광고주: A사",
      "제작 기간: 26.01.30-26.03.14 (최종 납품일 기준)",
    ]);
    const p = parseSlide(s);
    expect(p.period_start).toBe("2026-01-30");
    expect(p.period_end).toBe("2026-03-14");
    expect(p.year_month).toBe("2026-03");
  });

  it("외주 여부: 내부 면 in_house true", () => {
    const s = makeSlide([
      "광고주: A사",
      "외주 여부: 내부 제작(기획 및 촬영·편집 일체)",
    ]);
    expect(parseSlide(s).in_house).toBe(true);
  });

  it("외주 여부: 외주 면 in_house false", () => {
    const s = makeSlide([
      "광고주: A사",
      "외주 여부: 외주 제작 (업체 : 베리나이스)",
    ]);
    expect(parseSlide(s).in_house).toBe(false);
  });

  it("외주 여부 줄이 없으면 in_house null", () => {
    const s = makeSlide(["광고주: A사", "프로젝트: 제목"]);
    expect(parseSlide(s).in_house).toBe(null);
  });

  it("총 제작 편 수를 파싱한다", () => {
    const s = makeSlide([
      "광고주: A사",
      "총 제작 편 수: 1편 (vari.건 제외, 메인안 기준)",
    ]);
    expect(parseSlide(s).piece_count).toBe(1);
  });

  it("청구 금액 (만원)을 원 단위로 환산한다", () => {
    const s = makeSlide([
      "광고주: A사",
      "광고주 청구 금액(제작비): 250만원(인터뷰형 숏폼 1종 기준)",
    ]);
    expect(parseSlide(s).billing_amount).toBe(2500000);
  });

  it("청구 금액 (쉼표 + 만 원 띄어쓰기)을 환산한다", () => {
    const s = makeSlide([
      "광고주: A사",
      "광고주 청구 금액(제작비): 1,000만 원",
    ]);
    expect(parseSlide(s).billing_amount).toBe(10000000);
  });

  it("청구 금액이 비어있으면 null", () => {
    const s = makeSlide([
      "광고주: A사",
      "광고주 청구 금액(제작비): 만원",
    ]);
    expect(parseSlide(s).billing_amount).toBe(null);
  });

  it("숏폼 텍스트가 있으면 content_type 에 촬영숏폼 포함", () => {
    const s = makeSlide(["광고주: A사", "숏폼"]);
    expect(parseSlide(s).content_type).toContain("촬영숏폼");
  });

  it("스틸/사진이면 스틸사진, AI영상이면 AI영상", () => {
    expect(parseSlide(makeSlide(["광고주: A사", "스틸"])).content_type).toContain("스틸사진");
    expect(parseSlide(makeSlide(["광고주: A사", "AI영상"])).content_type).toContain("AI영상");
  });

  it("AI활용 텍스트가 있으면 ai_used true", () => {
    expect(parseSlide(makeSlide(["광고주: A사", "AI활용"])).ai_used).toBe(true);
    expect(parseSlide(makeSlide(["광고주: A사"])).ai_used).toBe(false);
  });

  it("이미지 imageProperties.link.url 에서 video_url 추출", () => {
    const s = makeSlide(["광고주: A사"], {
      link: "https://www.dropbox.com/scl/fo/abc/def",
    });
    expect(parseSlide(s).video_url).toBe("https://www.dropbox.com/scl/fo/abc/def");
  });

  it("링크가 없으면 video_url null", () => {
    expect(parseSlide(makeSlide(["광고주: A사"])).video_url).toBe(null);
  });
});

describe("실제 fixture 검증", () => {
  const slides = (fixture as any).slides ?? [];

  it("실제 fixture에서 프로젝트 슬라이드를 파싱한다", () => {
    const projects = slides.filter(isProjectSlide);
    expect(projects.length).toBeGreaterThan(100); // 실제 146
    const parsed = projects.map(parseSlide);
    expect(parsed.every((p: any) => p.client !== "")).toBe(true);
    // 영상 링크가 있는 항목이 다수 (Dropbox)
    expect(parsed.filter((p: any) => p.video_url).length).toBeGreaterThan(50);
  });

  it("실제 fixture: 기간/콘텐츠 타입이 대부분 채워진다", () => {
    const parsed = slides.filter(isProjectSlide).map(parseSlide);
    // 대부분 슬라이드에 제작 기간이 있다
    expect(parsed.filter((p: any) => p.period_start).length).toBeGreaterThan(100);
    // content_type 이 하나라도 잡힌 슬라이드가 다수
    expect(parsed.filter((p: any) => p.content_type.length > 0).length).toBeGreaterThan(100);
  });
});
