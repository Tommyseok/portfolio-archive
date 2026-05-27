// sync/src/types.ts
export type ContentType = "촬영숏폼" | "스틸사진" | "AI영상";

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

export interface AiFields {
  // 기본 분류
  industry: string;            // 업종
  keywords: string[];          // 검색 키워드 (셀럽, 제품, 소재 등)
  search_summary: string;      // 한 문장 요약

  // AE 세일즈 핵심 라벨 (썸네일+텍스트 분석)
  platform: string[];          // 집행 매체: 유튜브, 인스타그램, TV 등
  campaign_objective: string[]; // 캠페인 목적: 신제품론칭, 브랜드인지 등
  target_audience: string[];   // 타겟 고객층: MZ세대, 3040 등
  production_type: string[];   // 제작방식: 실사촬영, 3D, 모션그래픽 등
  visual_mood: string[];       // 비주얼 무드: 감성/따뜻한, 역동적 등

  _ai_confidence: "estimated";
}

export interface PortfolioItem extends ParsedFields, AiFields {
  id: string;
  source_slide_id: string;
}

// 공개용: billing_amount 제거
export type PublicPortfolioItem = Omit<PortfolioItem, "billing_amount">;
