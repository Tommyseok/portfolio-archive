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
  content_type: ContentType[];
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

export const SOURCE_TEAM_LABELS: Record<SourceTeam, string> = {
  PD: "촬영 (PD)",
  DS: "AI 이미지 (DS)",
  MS: "AI 영상·모션 (MS)",
};
