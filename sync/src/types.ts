// sync/src/types.ts
// 통합 크리덴셜 스키마 (2026-07 개편):
// - 광고주/업종/유형은 advertiser-master.json 에서 파생 (정확)
// - 소구포인트(appeal_points)만 AI 추정 — _ai_confidence 로 구분 표시
export type SourceTeam = "PD" | "DS" | "MS";

export type ContentType =
  | "촬영숏폼"
  | "스틸사진"
  | "AI영상"
  | "AI이미지"
  | "모션그래픽";

/** PD 덱 슬라이드에서 직접 파싱되는 필드 (정확도: 정확) */
export interface ParsedFields {
  client: string;
  project_title: string;
  overview: string;
  period_start: string | null; // YYYY-MM-DD
  period_end: string | null;
  year_month: string | null;   // YYYY-MM
  in_house: boolean | null;
  piece_count: number | null;
  billing_amount: number | null; // KRW, 민감
  content_type: ContentType[];
  ai_used: boolean;
  video_url: string | null;
  thumbnail: string | null;    // 상대경로
}

/** 광고주 마스터(정기회의시트 스냅샷)에서 파생되는 필드 (정확도: 정확) */
export interface DerivedFields {
  client: string;             // 마스터 대표 광고주명 (미매칭 시 정규화된 원문)
  client_raw: string;         // 덱 원문 표기
  client_matched: boolean;
  industry: string | null;            // 업종 (시트 N열 어휘)
  category_group: string | null;      // 대분류 (소비재/금융·서비스/디지털·콘텐츠)
  advertiser_type: string | null;     // 유형 (브랜드/서비스 | 플랫폼, 시트 O열)
  advertiser_status: "confirmed" | "proposed" | "unknown" | "unmatched";
  is_bidding: boolean;        // 비딩 제안용 여부
}

/** AI 추정 필드 (정확도: 추정 — UI에서 배지 표시) */
export interface AiFields {
  appeal_points: string[];    // 소구포인트: 주 1 + 보조 최대 1 (APPEAL_POINTS 어휘)
  keywords: string[];
  search_summary: string;
  _ai_confidence: "estimated" | null; // null = 아직 미분류
}

/** 3개 덱 공통 통합 아이템 */
export interface UnifiedItem extends DerivedFields, AiFields {
  id: string;
  source_team: SourceTeam;
  source_slide_id: string;
  title: string;              // PD: 프로젝트명 / DS·MS: "광고주 + USE/특이사항" 요약
  overview: string;           // PD: 개요 / DS: USE / MS: 특이사항
  year_month: string | null;
  content_type: ContentType[];
  tools: string[];            // DS: TOOL (GPT, 미드저니 등)
  team: string | null;        // DS: TEAM (DS1팀 등)
  video_urls: string[];
  thumbnail: string | null;
  ai_used: boolean;
  // PD 전용 (타 소스는 null)
  period_start: string | null;
  period_end: string | null;
  in_house: boolean | null;
  piece_count: number | null;
  billing_amount: number | null; // ⚠ 민감 — 공개본 제외
}

// 공개용: billing_amount 제거
export type PublicItem = Omit<UnifiedItem, "billing_amount">;

// (구 스키마 호환용 — 웹 마이그레이션 후 제거 예정)
export interface PortfolioItem extends ParsedFields {
  id: string;
  source_slide_id: string;
  industry: string;
  keywords: string[];
  search_summary: string;
  _ai_confidence: "estimated";
}
export type PublicPortfolioItem = Omit<PortfolioItem, "billing_amount">;
