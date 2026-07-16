// web/src/types.ts — Supabase credential_items 행과 동일 필드
export type SourceTeam = "PD" | "DS" | "MS";
export type ContentType = "촬영숏폼" | "스틸사진" | "AI영상" | "AI이미지" | "모션그래픽";

export interface Item {
  id: string;
  source_team: SourceTeam;
  source_slide_id: string;
  // 광고주 마스터 파생 (정확)
  client: string;
  client_raw: string;
  client_matched: boolean;
  industry: string | null;
  category_group: string | null;
  advertiser_type: string | null;
  advertiser_status: "confirmed" | "proposed" | "unknown" | "unmatched";
  is_bidding: boolean;
  // 콘텐츠
  title: string;
  overview: string;
  year_month: string | null;
  media_type: string | null;   // 소재타입 대분류 (영상/이미지/인터랙티브/옥외·Ambient/IMC)
  format: string | null;       // 소재타입 세부 (숏폼/배너/…)
  content_type: ContentType[]; // (구 축 — 파이프라인 원본, UI 미사용)
  tools: string[];
  team: string | null;
  video_urls: string[];
  thumbnail: string | null;
  ai_used: boolean;
  period_start: string | null;
  period_end: string | null;
  in_house: boolean | null;
  piece_count: number | null;
  // AI 추정
  appeal_points: string[];
  keywords: string[];
  search_summary: string;
  ai_confidence: "estimated" | null;
  // 편집 레이어
  custom_description: string | null;
  custom_tags: string[];
  extra_images: string[];
  creators: string[];
  showcase_approved: boolean;
  updated_by: string | null;
}

/** 필터에 쓰는 태그 = AI 소구포인트 + 수기 태그 합집합 */
export const tagsOf = (i: Item): string[] => [...new Set([...(i.appeal_points ?? []), ...(i.custom_tags ?? [])])];

/** 소재타입 2단 체계 (2026-07-16 확정) */
export const MEDIA_TAXONOMY: Record<string, string[]> = {
  "영상": ["롱폼", "숏폼"],
  "이미지": ["배너", "랜딩페이지", "스틸·화보"],
  "인터랙티브": ["게임", "웹페이지"],
  "옥외/Ambient": ["영상", "지면", "이벤트", "팝업"],
  "IMC": ["통합 캠페인"],
};

/** 필터용 복합 키 — 옥외>영상처럼 리프명이 겹쳐도 유일 */
export const formatKey = (media: string | null, format: string | null) =>
  media && format ? `${media}>${format}` : null;

export const SOURCE_TEAM_LABELS: Record<SourceTeam, string> = {
  PD: "촬영 (PD)",
  DS: "AI 이미지 (DS)",
  MS: "AI 영상·모션 (MS)",
};
