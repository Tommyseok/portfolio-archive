// 일회성: catalog 의 asset_images 를 Supabase RPC(tmp_set_assets, security definer)로 벌크 반영
import * as fs from "node:fs";

const URL = "https://nfwpdowrggvwbxroyury.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY ?? "";

interface Row { id: string; asset_images?: string[] }
const items: Row[] = JSON.parse(fs.readFileSync("data/catalog.public.json", "utf8"));
const withAssets = items.filter((i) => (i.asset_images?.length ?? 0) > 0);
console.log(`대상: ${withAssets.length}건`);

const BATCH = 100;
let updated = 0;
for (let s = 0; s < withAssets.length; s += BATCH) {
  const payload = withAssets.slice(s, s + BATCH).map((i) => ({ id: i.id, a: i.asset_images }));
  const res = await fetch(`${URL}/rest/v1/rpc/tmp_set_assets`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" },
    body: JSON.stringify({ payload }),
  });
  const body = await res.text();
  if (!res.ok) { console.error("FAIL", s, res.status, body.slice(0, 200)); process.exit(1); }
  updated += Number(body);
  console.log(`진행 ${Math.min(s + BATCH, withAssets.length)}/${withAssets.length} (누적 반영 ${updated})`);
}
console.log(`완료: ${updated}행 반영`);
