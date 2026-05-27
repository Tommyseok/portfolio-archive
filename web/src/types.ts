export type ContentType = "촬영숏폼" | "스틸사진" | "AI영상";
export interface PublicPortfolioItem {
  id: string; source_slide_id: string;
  client: string; project_title: string; overview: string;
  period_start: string | null; period_end: string | null; year_month: string | null;
  in_house: boolean | null; piece_count: number | null;
  content_type: ContentType[]; ai_used: boolean;
  video_url: string | null; thumbnail: string | null;
  industry: string; format_concept: string[]; mood: string[]; keywords: string[];
  search_summary: string; _ai_confidence: "estimated";
}
