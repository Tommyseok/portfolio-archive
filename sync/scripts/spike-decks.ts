// 스파이크: DS/MS 덱의 슬라이드 구조 표본 분석 (파서 확장 설계용)
import "dotenv/config";
import * as fs from "node:fs";
import { fetchPresentation } from "../src/slidesClient.js";

const decks: Record<string, string> = {
  DS: "1mz68G3ix4P4cwfvHRHD6fnBzqzzDL8VjkcuWB9LHRPI",
  MS: "1PfYn2BaOSC_HaHcCxHVynn0ISwtSbCxdNk3_hhioTq0",
};

interface El {
  link?: { url?: string };
  shape?: { text?: { textElements?: { textRun?: { content?: string } }[] } };
  image?: { contentUrl?: string; imageProperties?: { link?: { url?: string } } };
  video?: { url?: string; source?: string };
}

function slideTexts(slide: { pageElements?: El[] }): string[] {
  const out: string[] = [];
  for (const el of slide.pageElements ?? []) {
    const t = el.shape?.text?.textElements?.map((te) => te.textRun?.content ?? "").join("").trim();
    if (t) out.push(t.replace(/\n/g, " ⏎ "));
  }
  return out;
}

for (const [name, id] of Object.entries(decks)) {
  const pres = await fetchPresentation(id);
  const slides = pres.slides ?? [];
  fs.writeFileSync(`sync/test/fixtures/${name}-presentation.json`, JSON.stringify(pres, null, 2));
  console.log(`\n######## ${name}덱: ${slides.length}장 (fixture 저장됨) ########`);

  // 전수 통계
  let withClient = 0, withImage = 0, withLink = 0, withVideo = 0, textBlocksTotal = 0;
  for (const s of slides) {
    const txt = slideTexts(s as never).join("\n");
    if (/광고주|고객사|브랜드|Client/i.test(txt)) withClient++;
    let img = false, link = false, video = false;
    for (const el of (s.pageElements ?? []) as El[]) {
      if (el.image) img = true;
      if (el.link?.url || el.image?.imageProperties?.link?.url) link = true;
      if (el.video) video = true;
    }
    if (img) withImage++;
    if (link) withLink++;
    if (video) withVideo++;
    textBlocksTotal += slideTexts(s as never).length;
  }
  console.log(`통계: 광고주류 키워드 ${withClient} | 이미지 ${withImage} | 링크 ${withLink} | 임베드영상 ${withVideo} | 평균 텍스트블록 ${(textBlocksTotal / slides.length).toFixed(1)}`);

  // 표본: 앞 3장 + 중간 5장
  const samples = [...slides.slice(0, 3), ...slides.slice(Math.floor(slides.length / 2), Math.floor(slides.length / 2) + 5)];
  for (const s of samples) {
    const idx = slides.indexOf(s);
    console.log(`\n--- slide[${idx}] ${s.objectId} ---`);
    slideTexts(s as never).forEach((t) => console.log("  T:", t.slice(0, 120)));
    for (const el of (s.pageElements ?? []) as El[]) {
      if (el.video) console.log("  V:", el.video.source, el.video.url?.slice(0, 80));
      const link = el.link?.url ?? el.image?.imageProperties?.link?.url;
      if (link) console.log("  L:", link.slice(0, 80));
    }
  }
}
