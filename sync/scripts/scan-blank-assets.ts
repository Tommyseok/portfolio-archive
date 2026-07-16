// 에셋 품질 스캔: 거의 균일한(빈) 이미지·손상 파일 탐지 → 카탈로그에서 제외
import * as fs from "node:fs";
import sharp from "sharp";

const files = fs.readdirSync("data/assets").filter((f) => f.endsWith(".webp"));
const blank = new Set<string>();
let corrupt = 0;

for (const f of files) {
  try {
    // stats() 는 파이프라인을 무시하므로 흰 배경 합성 결과를 버퍼로 렌더 후 계산
    const buf = await sharp(`data/assets/${f}`).flatten({ background: "#fff" }).removeAlpha().png().toBuffer();
    const st = await sharp(buf).stats();
    const maxStd = Math.max(...st.channels.map((c) => c.stdev));
    const meanAvg = st.channels.reduce((s, c) => s + c.mean, 0) / st.channels.length;
    // 거의 흰색 + 저편차 = 빈 프레임/플레이스홀더
    if (maxStd < 25 && meanAvg > 235) blank.add(`assets/${f}`);
  } catch {
    corrupt++;
    blank.add(`assets/${f}`);
  }
}
console.log(`전체 ${files.length} | 빈/균일 ${blank.size} | 손상 ${corrupt}`);

// 카탈로그에서 해당 에셋 제거
const catalogs = ["data/catalog.public.json", "data/catalog.internal.json"];
let affected = 0, emptied = 0;
for (const path of catalogs) {
  const items = JSON.parse(fs.readFileSync(path, "utf8"));
  for (const it of items) {
    if (!it.asset_images?.length) continue;
    const filtered = it.asset_images.filter((a: string) => !blank.has(a));
    if (filtered.length !== it.asset_images.length) {
      if (path.includes("public")) { affected++; if (filtered.length === 0) emptied++; }
      it.asset_images = filtered;
    }
  }
  fs.writeFileSync(path, JSON.stringify(items, null, 2));
}
console.log(`영향 아이템 ${affected}건 (에셋 전부 제거되어 슬라이드 캡처로 폴백: ${emptied}건)`);
fs.writeFileSync("data/blank-assets.json", JSON.stringify([...blank], null, 2));
