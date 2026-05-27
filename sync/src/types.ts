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
  industry: string;
  format_concept: string[];
  mood: string[];
  keywords: string[];
  search_summary: string;
  _ai_confidence: "estimated";
}

export interface PortfolioItem extends ParsedFields, AiFields {
  id: string;
  source_slide_id: string;
}

// 공개용: billing_amount 제거
export type PublicPortfolioItem = Omit<PortfolioItem, "billing_amount">;
