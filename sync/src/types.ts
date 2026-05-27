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
  // 비전 기반 크리에이티브 라벨 (썸네일 이미지 분석)
  visual_style: string[];     // 예: ["미니멀", "시네마틱"]
  color_tone: string[];       // 예: ["웜톤", "비비드"]
  animation_type: string[];   // 예: ["3D", "모션그래픽"]
  creative_direction: string[]; // 예: ["브랜드스토리", "제품쇼케이스"]
  _ai_confidence: "estimated";
}

export interface PortfolioItem extends ParsedFields, AiFields {
  id: string;
  source_slide_id: string;
}

// 공개용: billing_amount 제거
export type PublicPortfolioItem = Omit<PortfolioItem, "billing_amount">;
