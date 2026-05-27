// sync/src/buildCatalog.ts
// 오케스트레이션 엔트리포인트: presentation fetch → 프로젝트 슬라이드 파싱 →
// 썸네일 다운로드 → (변경분만) AI 분류 → catalog.internal/public JSON 작성.
// `npm run sync` 가 이 파일을 가리킨다.
import "dotenv/config";
import * as fs from "node:fs";
import { fetchPresentation, downloadThumbnail } from "./slidesClient.js";
import { parseSlide, isProjectSlide } from "./parseSlide.js";
import { classify } from "./classify.js";
import type { PortfolioItem, PublicPortfolioItem } from "./types.js";

const PRES_ID = process.env.PRESENTATION_ID!;
const INTERNAL = "data/catalog.internal.json";
const PUBLIC = "data/catalog.public.json";

/** 클라이언트·제목·슬라이드 id 로 안정적인 slug id 생성. */
function slug(client: string, title: string, slideId: string): string {
  const base = `${client}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${base}-${slideId.slice(-4)}`;
}

async function main(): Promise<void> {
  if (!PRES_ID) throw new Error("PRESENTATION_ID 환경변수가 설정되지 않았습니다.");

  const pres = await fetchPresentation(PRES_ID);
  // googleapis 의 Schema$Page 와 parseSlide 의 로컬 Slide 인터페이스를 잇는 최소 경계 캐스팅.
  const projectSlides = (pres.slides ?? []).filter(isProjectSlide as any);
  console.log(`프로젝트 슬라이드 ${projectSlides.length}개`);

  // 멱등 diff 를 위해 이전 카탈로그를 source_slide_id 기준으로 인덱싱.
  const prev: PortfolioItem[] = fs.existsSync(INTERNAL)
    ? JSON.parse(fs.readFileSync(INTERNAL, "utf8"))
    : [];
  const prevById = new Map(prev.map((p) => [p.source_slide_id, p]));

  const items: PortfolioItem[] = [];
  let classified = 0;
  let reused = 0;

  for (const slide of projectSlides as any[]) {
    const slideId = slide.objectId as string;
    const parsed = parseSlide(slide);
    parsed.thumbnail = await downloadThumbnail(PRES_ID, slideId);

    // overview 와 project_title 이 모두 동일하면 이전 AI 필드를 재사용해 Claude 호출 절약.
    const existing = prevById.get(slideId);
    const unchanged =
      !!existing &&
      existing.overview === parsed.overview &&
      existing.project_title === parsed.project_title;

    const ai = unchanged
      ? {
          industry: existing!.industry,
          format_concept: existing!.format_concept,
          mood: existing!.mood,
          keywords: existing!.keywords,
          search_summary: existing!.search_summary,
          _ai_confidence: "estimated" as const,
        }
      : await classify(parsed);

    if (unchanged) {
      reused++;
    } else {
      classified++;
      console.log("AI 분류:", parsed.client, "|", parsed.project_title.slice(0, 30));
    }

    items.push({
      id: slug(parsed.client, parsed.project_title, slideId),
      source_slide_id: slideId,
      ...parsed,
      ...ai,
    });
  }

  fs.mkdirSync("data", { recursive: true });
  fs.writeFileSync(INTERNAL, JSON.stringify(items, null, 2));

  // 공개본: billing_amount 제거.
  const publicItems: PublicPortfolioItem[] = items.map(
    ({ billing_amount, ...rest }) => rest,
  );
  fs.writeFileSync(PUBLIC, JSON.stringify(publicItems, null, 2));

  console.log(
    `완료: ${items.length}건 (신규분류 ${classified}, 재사용 ${reused}). 공개본 ${publicItems.length}건`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
