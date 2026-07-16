// 임시 정찰 스크립트: 신규 슬라이드 덱 접근 가능 여부 확인
import "dotenv/config";
import { fetchPresentation } from "../src/slidesClient.js";

const decks: Record<string, string> = {
  "DS팀(생성형AI)": "1mz68G3ix4P4cwfvHRHD6fnBzqzzDL8VjkcuWB9LHRPI",
  "MS팀(AI영상+모션)": "1PfYn2BaOSC_HaHcCxHVynn0ISwtSbCxdNk3_hhioTq0",
};

for (const [name, id] of Object.entries(decks)) {
  try {
    const p = await fetchPresentation(id);
    console.log(`${name}: OK — ${(p.slides ?? []).length}장, 제목: ${p.title}`);
  } catch (e) {
    console.log(`${name}: FAIL — ${String((e as Error)?.message ?? e).slice(0, 150)}`);
  }
}
