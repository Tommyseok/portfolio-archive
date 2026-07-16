// 일회성: MS팀 드롭박스 2024년분 16건 → credential_items INSERT SQL 생성
// (덱에 없는 과거분 — 파일명에서 광고주·비딩·연월 파싱)
import * as fs from "node:fs";
import { loadMaster, buildResolver } from "../src/advertiserMaster.js";

const files: { name: string; href: string }[] = JSON.parse(
  fs.readFileSync("data/ms-dropbox-2024.json", "utf8"),
);

const resolver = buildResolver(loadMaster());

const rows = files.map((f, idx) => {
  let base = f.name.replace(/\.(mp4|gif|mov)$/i, "");
  let bidding = false;
  if (base.startsWith("비딩_")) { bidding = true; base = base.slice(3); }
  // 광고주 = 첫 세그먼트 (MLB성인/MLB_키즈 → MLB)
  let clientRaw = base.split("_")[0].replace(/성인$|키즈$/, "").trim();
  const derived = resolver.resolve(clientRaw);
  const mMonth = f.name.match(/(\d{1,2})월/);
  const year_month = mMonth ? `2024-${mMonth[1].padStart(2, "0")}` : "2024";
  const isGif = /\.gif$/i.test(f.name);
  return {
    id: `ms-dbx24-${String(idx + 1).padStart(2, "0")}`,
    source_team: "MS",
    source_slide_id: `dropbox-2024/${f.name}`,
    ...derived,
    is_bidding: derived.is_bidding || bidding,
    title: base,
    overview: "MS팀 AI활용 아카이브(드롭박스) 2024년분",
    year_month,
    content_type: [isGif ? "AI이미지" : "AI영상"],
    tools: [],
    team: null,
    video_urls: [f.href],
    thumbnail: null,
    ai_used: true,
    period_start: null, period_end: null, in_house: true, piece_count: null,
    appeal_points: [], keywords: [], search_summary: "", ai_confidence: null,
  };
});

const json = JSON.stringify(rows).replace(/'/g, "''");
const sql = `insert into public.credential_items select * from jsonb_populate_recordset(null::public.credential_items, '${json}'::jsonb) on conflict (id) do nothing;`;
fs.writeFileSync("data/ms-dropbox-2024.sql", sql);
console.log("rows:", rows.length, "| unmatched:", rows.filter((r) => !r.client_matched).map((r) => r.client_raw).join(", ") || "없음");
console.log("clients:", [...new Set(rows.map((r) => r.client))].join(", "));
