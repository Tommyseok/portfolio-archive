import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import { tableKV, parseKoreanMonth, parseDsSlides, parseMsSlides } from "../src/parseDeck.js";
import { buildResolver, normClient } from "../src/advertiserMaster.js";

const makeTableSlide = (rows: string[][], links: string[] = []) => ({
  objectId: "gTEST",
  pageElements: [
    {
      table: {
        tableRows: rows.map((cells) => ({
          tableCells: cells.map((c) => ({ text: { textElements: [{ textRun: { content: c } }] } })),
        })),
      },
    },
    ...links.map((url) => ({ objectId: "img", image: { contentUrl: "https://x" }, link: { url } })),
  ],
});

describe("parseKoreanMonth", () => {
  it("연월 표기를 정규화한다", () => {
    expect(parseKoreanMonth("2026년 6월")).toBe("2026-06");
    expect(parseKoreanMonth("26년 12월")).toBe("2026-12");
    expect(parseKoreanMonth("2025.3")).toBe("2025-03");
    expect(parseKoreanMonth("없음")).toBeNull();
  });
});

describe("parseDsSlides", () => {
  it("메타 표에서 필드를 추출한다", () => {
    const slide = makeTableSlide([
      ["DATE", "2026년 6월"],
      ["CLIENT", "올영글로벌"],
      ["TEAM", "DS1팀"],
      ["TOOL", "GPT, 제미나이"],
      ["USE", "메인 오브제 생성"],
    ]);
    const [r] = parseDsSlides([slide]);
    expect(r.client_raw).toBe("올영글로벌");
    expect(r.year_month).toBe("2026-06");
    expect(r.tools).toEqual(["GPT", "제미나이"]);
    expect(r.use).toBe("메인 오브제 생성");
  });

  it("표 없는 슬라이드는 건너뛴다", () => {
    expect(parseDsSlides([{ objectId: "g1", pageElements: [] }])).toHaveLength(0);
  });
});

describe("parseMsSlides", () => {
  it("메타 표와 드롭박스 링크를 추출한다", () => {
    const slide = makeTableSlide(
      [
        ["제작일자", "2026년 5월"],
        ["광고주", "빗썸 비딩"],
        ["특이사항", "-"],
      ],
      ["https://www.dropbox.com/scl/fi/a.mp4", "https://www.dropbox.com/scl/fi/b.mp4"],
    );
    const [r] = parseMsSlides([slide]);
    expect(r.client_raw).toBe("빗썸 비딩");
    expect(r.year_month).toBe("2026-05");
    expect(r.note).toBe("");
    expect(r.video_urls).toHaveLength(2);
  });
});

describe("advertiserMaster resolver", () => {
  const master = {
    updated_at: "t",
    category_groups: { "금융·서비스": ["금융/핀테크"], "소비재": ["뷰티"] },
    advertisers: [
      { client: "빗썸", aliases: [], business_name: null, industry: "금융/핀테크", advertiser_type: "브랜드/서비스", status: "confirmed" as const },
      { client: "올리브영", aliases: ["올영글로벌"], business_name: null, industry: "뷰티", advertiser_type: "플랫폼", status: "confirmed" as const },
    ],
  };
  const r = buildResolver(master);

  it("비딩 접미사를 분리하고 매칭한다", () => {
    const d = r.resolve("빗썸(비딩)");
    expect(d.client).toBe("빗썸");
    expect(d.is_bidding).toBe(true);
    expect(d.industry).toBe("금융/핀테크");
    expect(d.category_group).toBe("금융·서비스");
  });

  it("별칭·공백·대소문자를 흡수한다", () => {
    expect(r.resolve("올영글로벌").client).toBe("올리브영");
    expect(normClient("29CM").key).toBe(normClient("29cm").key);
  });

  it("미매칭은 unmatched 로 표시한다", () => {
    const d = r.resolve("모르는광고주");
    expect(d.client_matched).toBe(false);
    expect(d.advertiser_status).toBe("unmatched");
  });
});

describe("실제 fixture 스모크", () => {
  it("DS/MS fixture 에서 기대 건수를 파싱한다", () => {
    const ds = JSON.parse(fs.readFileSync("sync/test/fixtures/DS-presentation.json", "utf8"));
    const ms = JSON.parse(fs.readFileSync("sync/test/fixtures/MS-presentation.json", "utf8"));
    const dsItems = parseDsSlides(ds.slides ?? []);
    const msItems = parseMsSlides(ms.slides ?? []);
    expect(dsItems.length).toBeGreaterThan(300);
    expect(msItems.length).toBeGreaterThan(60);
    expect(dsItems.every((i) => i.client_raw)).toBe(true);
    // MS 아이템 대부분은 영상 링크 보유
    expect(msItems.filter((i) => i.video_urls.length > 0).length).toBeGreaterThan(55);
  });
});
