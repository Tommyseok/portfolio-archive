// sync/src/buildCatalog.ts
// 통합 크리덴셜 오케스트레이션: PD·DS·MS 3개 덱 fetch → 파싱 →
// 광고주 마스터로 업종·유형 파생 → 썸네일 → (변경분만) 소구 AI 분류 → catalog 작성.
// `npm run sync` 가 이 파일을 가리킨다.
import dotenv from "dotenv";
dotenv.config({ override: true }); // 셸에 빈 ANTHROPIC_API_KEY가 있어도 .env 값으로 덮어쓴다
import * as fs from "node:fs";
import { fetchPresentation, downloadThumbnail } from "./slidesClient.js";
import { parseSlide, isProjectSlide } from "./parseSlide.js";
import { parseDsSlides, parseMsSlides } from "./parseDeck.js";
import { loadMaster, buildResolver } from "./advertiserMaster.js";
import { classify } from "./classify.js";
import type { AiFields, UnifiedItem, PublicItem, SourceTeam } from "./types.js";

const DECKS: Record<SourceTeam, string> = {
  PD: process.env.PRESENTATION_ID ?? "1gkATsneTHnLjxJLhVnTF0GiZKAab8WMYt7843uJ03ZE",
  DS: process.env.DS_PRESENTATION_ID ?? "1mz68G3ix4P4cwfvHRHD6fnBzqzzDL8VjkcuWB9LHRPI",
  MS: process.env.MS_PRESENTATION_ID ?? "1PfYn2BaOSC_HaHcCxHVynn0ISwtSbCxdNk3_hhioTq0",
};
const INTERNAL = "data/catalog.internal.json";
const PUBLIC = "data/catalog.public.json";
// SKIP_CLASSIFY=1 이면 Claude 호출 없이 AI 필드를 미분류(null)로 둔다.
const SKIP_CLASSIFY = process.env.SKIP_CLASSIFY === "1";

function slug(client: string, title: string, slideId: string): string {
  const base = `${client}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  // slideId 전체를 붙여 덱 내 유일성 보장 (접미사 4자만 쓰면 충돌 발생)
  return `${base}-${slideId.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

const UNCLASSIFIED_AI: AiFields = {
  appeal_points: [],
  keywords: [],
  search_summary: "",
  _ai_confidence: null,
};

/** 소재타입 2단 매핑 (2026-07-16 확정 체계). 스틸이 섞이면 화보 제작 건으로 본다. */
function mediaFormatOf(contentType: string[]): { media_type: string; format: string } {
  if (contentType.includes("스틸사진")) return { media_type: "이미지", format: "스틸·화보" };
  if (contentType.includes("AI이미지")) return { media_type: "이미지", format: "배너" };
  return { media_type: "영상", format: "숏폼" };
}

async function main(): Promise<void> {
  const master = loadMaster();
  const resolver = buildResolver(master);

  // 멱등 diff: 이전 카탈로그를 (팀:슬라이드ID) 기준으로 인덱싱
  const prev: UnifiedItem[] = fs.existsSync(INTERNAL)
    ? JSON.parse(fs.readFileSync(INTERNAL, "utf8"))
    : [];
  const prevByKey = new Map(
    prev
      .filter((p) => p.source_team) // 구 스키마 항목은 재분류 대상
      .map((p) => [`${p.source_team}:${p.source_slide_id}`, p]),
  );

  const items: UnifiedItem[] = [];
  let classified = 0, reused = 0, skipped = 0;

  // ── PD 덱 (촬영숏폼·스틸·AI영상 — 텍스트 상세 슬라이드) ──
  {
    const pres = await fetchPresentation(DECKS.PD);
    const slides = (pres.slides ?? []).filter(isProjectSlide as never);
    console.log(`[PD] 프로젝트 슬라이드 ${slides.length}개`);
    for (const slide of slides as never[]) {
      const slideId = (slide as { objectId: string }).objectId;
      const parsed = parseSlide(slide);
      const derived = resolver.resolve(parsed.client);
      const thumbnail = await downloadThumbnail(DECKS.PD, slideId);
      items.push({
        id: `pd-${slug(derived.client, parsed.project_title, slideId)}`,
        source_team: "PD",
        source_slide_id: slideId,
        ...derived,
        ...UNCLASSIFIED_AI,
        title: parsed.project_title,
        overview: parsed.overview,
        year_month: parsed.year_month,
        ...mediaFormatOf(parsed.content_type),
        content_type: parsed.content_type,
        tools: [],
        team: null,
        video_urls: parsed.video_url ? [parsed.video_url] : [],
        thumbnail,
        ai_used: parsed.ai_used,
        period_start: parsed.period_start,
        period_end: parsed.period_end,
        in_house: parsed.in_house,
        piece_count: parsed.piece_count,
        billing_amount: parsed.billing_amount,
      });
    }
  }

  // ── DS 덱 (생성형AI 이미지 크리에이티브 — 메타 표) ──
  {
    const pres = await fetchPresentation(DECKS.DS);
    const parsedItems = parseDsSlides((pres.slides ?? []) as never[]);
    console.log(`[DS] 메타 표 슬라이드 ${parsedItems.length}개`);
    for (const p of parsedItems) {
      const derived = resolver.resolve(p.client_raw);
      const thumbnail = await downloadThumbnail(DECKS.DS, p.source_slide_id, undefined, "DS-");
      items.push({
        id: `ds-${slug(derived.client, p.use, p.source_slide_id)}`,
        source_team: "DS",
        source_slide_id: p.source_slide_id,
        ...derived,
        ...UNCLASSIFIED_AI,
        title: `${derived.client} — ${p.use || "생성형AI 크리에이티브"}`,
        overview: p.use,
        year_month: p.year_month,
        media_type: "이미지",
        format: "배너",
        content_type: ["AI이미지"],
        tools: p.tools,
        team: p.team,
        video_urls: [],
        thumbnail,
        ai_used: true,
        period_start: null,
        period_end: null,
        in_house: true,
        piece_count: null,
        billing_amount: null,
      });
    }
  }

  // ── MS 덱 (생성형AI 영상 + 모션그래픽 — 메타 표 + 드롭박스 링크) ──
  {
    const pres = await fetchPresentation(DECKS.MS);
    const parsedItems = parseMsSlides((pres.slides ?? []) as never[]);
    console.log(`[MS] 메타 표 슬라이드 ${parsedItems.length}개`);
    for (const p of parsedItems) {
      const derived = resolver.resolve(p.client_raw);
      const thumbnail = await downloadThumbnail(DECKS.MS, p.source_slide_id, undefined, "MS-");
      items.push({
        id: `ms-${slug(derived.client, p.note || "ai영상", p.source_slide_id)}`,
        source_team: "MS",
        source_slide_id: p.source_slide_id,
        ...derived,
        ...UNCLASSIFIED_AI,
        title: `${derived.client} — AI영상·모션${derived.is_bidding ? " (비딩)" : ""}`,
        overview: p.note,
        year_month: p.year_month,
        media_type: "영상",
        format: "숏폼",
        content_type: ["AI영상"],
        tools: [],
        team: null,
        video_urls: p.video_urls,
        thumbnail,
        ai_used: true,
        period_start: null,
        period_end: null,
        in_house: true,
        piece_count: p.video_urls.length || null,
        billing_amount: null,
      });
    }
  }

  // ── 소구 AI 분류 (변경분만, 멱등) ──
  // 중단·타임아웃 대비: 25건마다 카탈로그를 중간 저장 → 재시작 시 분류 결과 재사용
  const writeCatalogs = () => {
    fs.mkdirSync("data", { recursive: true });
    fs.writeFileSync(INTERNAL, JSON.stringify(items, null, 2));
    const pub: PublicItem[] = items.map(({ billing_amount, ...rest }) => rest);
    fs.writeFileSync(PUBLIC, JSON.stringify(pub, null, 2));
  };

  for (const item of items) {
    const key = `${item.source_team}:${item.source_slide_id}`;
    const existing = prevByKey.get(key);
    const unchanged =
      !!existing &&
      existing.overview === item.overview &&
      existing.title === item.title &&
      existing._ai_confidence === "estimated" &&
      (existing.appeal_points?.length ?? 0) > 0;

    if (unchanged) {
      item.appeal_points = existing!.appeal_points;
      item.keywords = existing!.keywords;
      item.search_summary = existing!.search_summary;
      item._ai_confidence = "estimated";
      reused++;
    } else if (SKIP_CLASSIFY) {
      skipped++;
    } else {
      // 개별 실패는 미분류로 남기고 계속 진행 (다음 sync 에서 자동 재시도됨)
      try {
        const thumbPath = item.thumbnail ? `data/${item.thumbnail}` : null;
        const ai = await classify({
          client: item.client,
          title: item.title,
          overview: item.overview,
          thumbnail: thumbPath,
        });
        Object.assign(item, ai);
        classified++;
        if (classified % 25 === 0) {
          writeCatalogs(); // 체크포인트
          console.log(`AI 소구분류 진행: ${classified}건 완료 (체크포인트 저장)`);
        }
      } catch (e) {
        skipped++;
        console.warn(`⚠ 분류 실패(미분류로 유지) [${item.source_team}] ${item.client}: ${String((e as Error)?.message).slice(0, 100)}`);
      }
    }
  }

  writeCatalogs();

  // ── 검수 리포트 ──
  const byTeam = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.source_team] = (acc[i.source_team] ?? 0) + 1;
    return acc;
  }, {});
  const unmatched = [...new Set(items.filter((i) => !i.client_matched).map((i) => i.client_raw))];
  const proposed = [...new Set(items.filter((i) => i.advertiser_status === "proposed").map((i) => i.client))];
  console.log(`\n완료: 총 ${items.length}건`, JSON.stringify(byTeam));
  console.log(`소구분류: 신규 ${classified}, 재사용 ${reused}, 미분류 ${skipped}`);
  console.log(`비딩: ${items.filter((i) => i.is_bidding).length}건`);
  if (unmatched.length) console.log(`⚠ 마스터 미매칭 광고주 (검수 필요): ${unmatched.join(", ")}`);
  if (proposed.length) console.log(`ℹ 업종 제안값(추정) 광고주: ${proposed.join(", ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
