// 스파이크: 표본 슬라이드 썸네일 다운로드 (구조 육안 확인용)
import "dotenv/config";
import * as fs from "node:fs";
import { fetchPresentation, downloadThumbnail } from "../src/slidesClient.js";

const OUT = process.env.SPIKE_OUT ?? "data/spike-thumbs";
const targets: Record<string, { id: string; indices: number[] }> = {
  DS: { id: "1mz68G3ix4P4cwfvHRHD6fnBzqzzDL8VjkcuWB9LHRPI", indices: [5, 100, 208, 221, 300] },
  MS: { id: "1PfYn2BaOSC_HaHcCxHVynn0ISwtSbCxdNk3_hhioTq0", indices: [10, 41, 60] },
};

fs.mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(targets)) {
  const pres = await fetchPresentation(t.id);
  const slides = pres.slides ?? [];
  for (const i of t.indices) {
    const s = slides[i];
    if (!s?.objectId) continue;
    const rel = await downloadThumbnail(t.id, s.objectId, `${OUT}/thumbnails`);
    fs.renameSync(`${OUT}/${rel}`, `${OUT}/${name}-${i}.png`);
    console.log(`${name}[${i}] → ${OUT}/${name}-${i}.png`);
  }
}
