// 일회성: catalog.public.json → Supabase credential_items 적재 (REST upsert)
// 실행 전 tmp_bulk_load 정책 필요, 실행 후 정책 제거할 것.
import * as fs from "node:fs";

const URL = "https://nfwpdowrggvwbxroyury.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";

interface CatalogItem { [k: string]: unknown; _ai_confidence: string | null; billing_amount?: never }

const items: CatalogItem[] = JSON.parse(fs.readFileSync("data/catalog.public.json", "utf8"));
const rows = items.map((i) => ({
  id: i.id, source_team: i.source_team, source_slide_id: i.source_slide_id,
  client: i.client, client_raw: i.client_raw, client_matched: i.client_matched,
  industry: i.industry, category_group: i.category_group, advertiser_type: i.advertiser_type,
  advertiser_status: i.advertiser_status, is_bidding: i.is_bidding,
  title: i.title, overview: i.overview, year_month: i.year_month,
  content_type: i.content_type, tools: i.tools, team: i.team,
  video_urls: i.video_urls, thumbnail: i.thumbnail, ai_used: i.ai_used,
  period_start: i.period_start, period_end: i.period_end, in_house: i.in_house, piece_count: i.piece_count,
  appeal_points: i.appeal_points, keywords: i.keywords, search_summary: i.search_summary,
  ai_confidence: i._ai_confidence,
}));

const BATCH = 100;
let ok = 0;
for (let s = 0; s < rows.length; s += BATCH) {
  const chunk = rows.slice(s, s + BATCH);
  const res = await fetch(`${URL}/rest/v1/credential_items`, {
    method: "POST",
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(chunk),
  });
  if (!res.ok) {
    console.error("FAIL batch", s, res.status, (await res.text()).slice(0, 300));
    process.exit(1);
  }
  ok += chunk.length;
  console.log(`적재 ${ok}/${rows.length}`);
}
console.log("완료");
