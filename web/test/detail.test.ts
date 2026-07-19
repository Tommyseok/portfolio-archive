import { describe, it, expect } from "vitest";
import { detailTitle, detailSubtitle, detailDesc, detailGallery, detailLinks } from "../src/lib/detail";
import type { Item } from "../src/types";

const it_ = (over: Partial<Item>): Item => ({
  id: "x", source_team: "PD", source_slide_id: "g", client: "메디힐", client_raw: "메디힐",
  client_matched: true, industry: "뷰티", category_group: "소비재", advertiser_type: "브랜드/서비스",
  advertiser_status: "confirmed", is_bidding: false, title: "선케어", overview: "개요", year_month: "2026-04",
  media_type: "Video production", format: "Short form", content_type: [], production_team: "PD",
  production_method: "실촬영", tools: [], team: null, video_urls: [], asset_images: [], thumbnail: null,
  ai_used: false, period_start: null, period_end: null, in_house: true, piece_count: 1,
  appeal_points: [], keywords: [], search_summary: "요약", ai_confidence: null,
  custom_description: null, custom_tags: [], extra_images: [], creators: [],
  showcase_approved: true, updated_by: null, ...over,
});

describe("detail 폴백", () => {
  it("detailTitle: custom_title → client", () => {
    expect(detailTitle(it_({ custom_title: "커스텀" }))).toBe("커스텀");
    expect(detailTitle(it_({ custom_title: null }))).toBe("메디힐");
  });
  it("detailSubtitle: media_type, format 결합", () => {
    expect(detailSubtitle(it_({}))).toBe("Video production, Short form");
    expect(detailSubtitle(it_({ format: null }))).toBe("Video production");
    expect(detailSubtitle(it_({ media_type: null, format: null }))).toBe("");
  });
  it("detailDesc: custom_description → overview → search_summary", () => {
    expect(detailDesc(it_({ custom_description: "설명" }))).toBe("설명");
    expect(detailDesc(it_({ custom_description: null }))).toBe("개요");
    expect(detailDesc(it_({ custom_description: null, overview: "" }))).toBe("요약");
  });
  it("detailGallery: asset+extra 합침, 없으면 thumbnail", () => {
    expect(detailGallery(it_({ asset_images: ["a"], extra_images: ["e"] }))).toEqual(["a", "e"]);
    expect(detailGallery(it_({ asset_images: [], extra_images: [], thumbnail: "t" }))).toEqual(["t"]);
    expect(detailGallery(it_({ asset_images: [], extra_images: [], thumbnail: null }))).toEqual([]);
  });
  it("detailLinks: custom_links 우선, 없으면 video_urls→'영상 보기 N'", () => {
    expect(detailLinks(it_({ custom_links: [{ label: "리뷰", url: "u1" }] }))).toEqual([{ label: "리뷰", url: "u1" }]);
    expect(detailLinks(it_({ video_urls: ["v1", "v2"] }))).toEqual([
      { label: "영상 보기 1", url: "v1" },
      { label: "영상 보기 2", url: "v2" },
    ]);
    expect(detailLinks(it_({ video_urls: ["v1"] }))).toEqual([{ label: "영상 보기", url: "v1" }]);
    expect(detailLinks(it_({}))).toEqual([]);
  });
});
