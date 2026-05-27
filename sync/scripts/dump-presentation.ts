// sync/scripts/dump-presentation.ts
// 검증 스파이크: presentation 을 가져와 fixture 로 저장하고,
// 앞쪽 슬라이드들의 텍스트/이미지/하이퍼링크 구조를 출력해
// "영상 링크가 el.link.url 인지 el.image.imageProperties.link.url 인지"를 학습한다.
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { fetchPresentation } from "../src/slidesClient.js";

const id = process.env.PRESENTATION_ID;
if (!id) {
  console.error("PRESENTATION_ID 환경변수가 필요합니다 (.env 참조).");
  process.exit(1);
}

const pres = await fetchPresentation(id);

const fixtureDir = path.join("sync", "test", "fixtures");
fs.mkdirSync(fixtureDir, { recursive: true });
const fixturePath = path.join(fixtureDir, "sample-presentation.json");
fs.writeFileSync(fixturePath, JSON.stringify(pres, null, 2));

const slides = pres.slides ?? [];
console.log(`총 슬라이드: ${slides.length}`);
console.log(`fixture 저장: ${fixturePath}`);

// 앞쪽 ~12개 슬라이드의 구조를 출력해 링크 경로를 확인.
for (const slide of slides.slice(0, 12)) {
  const textBlocks: string[] = [];

  for (const el of slide.pageElements ?? []) {
    // 텍스트 블록 수집
    const t = el.shape?.text?.textElements
      ?.map((te) => te.textRun?.content ?? "")
      .join("");
    if (t?.trim()) textBlocks.push(t.trim());

    // 이미지 요소: contentUrl + 두 경로의 hyperlink 모두 출력.
    // 주의: 타입 스키마(Schema$PageElement)에는 element-level `link` 가 없으나,
    //   런타임에 존재할 가능성을 검증하는 게 이 스파이크의 목적이므로 느슨하게 접근한다.
    if (el.image) {
      const loose = el as { link?: { url?: string } };
      const contentUrl = el.image.contentUrl ?? "";
      const elementLink = loose.link?.url ?? null;
      const imagePropLink = el.image.imageProperties?.link?.url ?? null;
      console.log(
        `  [image] contentUrl=${contentUrl.slice(0, 60)}` +
          `${contentUrl.length > 60 ? "…" : ""} ` +
          `el.link.url=${elementLink ?? "(none)"} ` +
          `el.image.imageProperties.link.url=${imagePropLink ?? "(none)"}`,
      );
    }
  }

  console.log(
    `slide ${slide.objectId}: 텍스트 ${textBlocks.length}블록`,
  );
}
