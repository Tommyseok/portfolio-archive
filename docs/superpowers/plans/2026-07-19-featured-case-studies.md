# Featured Case Studies + 통합 DetailView 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Showcase에 Featured Case Studies 섹션(히어로1+타일4, 5개 고정·관리자 순서)을 추가하고, 공개 CaseView와 스태프 ItemModal을 하나의 스택형 다크 DetailView로 통합한다.

**Architecture:** 순수 선택·폴백 로직은 `web/src/lib/featured.ts`·`web/src/lib/detail.ts`로 분리해 node vitest로 TDD한다. 컴포넌트(`FeaturedSection`, `DetailView`)는 그 로직을 소비하며 빌드+브라우저 프리뷰로 검증한다. Featured 지정·순서·큐레이션 문구는 DetailView 편집모드에서 기존 `saveOverlay`로 저장하고, 신규 컬럼은 Supabase 마이그레이션으로 추가한다.

**Tech Stack:** React 19 + Vite 8, TypeScript, react-router 7, Supabase JS, vitest(node), Supabase MCP(apply_migration).

**설계 근거:** [2026-07-19-featured-case-studies-design.md](../specs/2026-07-19-featured-case-studies-design.md)

---

## 파일 구조

- **신규** `web/src/lib/featured.ts` — Featured 선택(`selectFeatured`) + 타일 표시 폴백(`coverOf`/`headlineOf`/`subcopyOf`/`kickerOf`)
- **신규** `web/src/lib/detail.ts` — 상세 뷰 필드 폴백(`detailTitle`/`detailSubtitle`/`detailDesc`/`detailGallery`/`detailLinks`)
- **신규** `web/test/featured.test.ts`, `web/test/detail.test.ts`
- **신규** `web/src/components/FeaturedSection.tsx` — 히어로+타일 렌더
- **신규** `web/src/components/DetailView.tsx` — 통합 상세(읽기/소셜/편집+Featured 컨트롤). `Comments`·`TagEditor` 흡수
- **수정** `web/src/types.ts` — `Item`에 신규 필드
- **수정** `web/src/lib/useData.ts` — `saveOverlay` patch 타입 확장
- **수정** `web/src/pages/Showcase.tsx` — FeaturedSection 삽입 + CaseView→DetailView
- **수정** `web/src/pages/Explore.tsx` — ItemModal→DetailView
- **수정** `web/src/index.css` — `.featured-*`, `.dv-*`(detail) 클래스
- **삭제** `web/src/components/CaseView.tsx`, `web/src/components/ItemModal.tsx`
- **DB** Supabase `credential_items` 신규 컬럼 8개 + RLS update 허용 컬럼 확장

전 스텝은 리포 루트 `C:\Users\MADUP\Desktop\01_프로젝트\Credential`에서 실행. 테스트는 `npx vitest run <path>`.

---

### Task 1: Supabase 마이그레이션 — 신규 컬럼

**Files:** DB만 (Supabase MCP `apply_migration`)

- [ ] **Step 1: 현재 컬럼 확인**

Supabase MCP `list_tables`(schemas: ["public"])로 `credential_items`에 아래 컬럼이 없음을 확인.

- [ ] **Step 2: 마이그레이션 적용**

Supabase MCP `apply_migration` (name: `featured_case_studies_columns`) 로 실행:

```sql
alter table public.credential_items
  add column if not exists is_featured boolean not null default false,
  add column if not exists featured_rank smallint,
  add column if not exists featured_headline text,
  add column if not exists featured_subcopy text,
  add column if not exists featured_kicker text,
  add column if not exists featured_cover text,
  add column if not exists custom_title text,
  add column if not exists custom_links jsonb not null default '[]'::jsonb;

comment on column public.credential_items.featured_rank is '1..5, 1=hero; null=비지정';
```

- [ ] **Step 3: RLS update 정책 확인**

Supabase MCP `execute_sql`:

```sql
select polname, pg_get_expr(polqual, polrelid) as using, pg_get_expr(polwithcheck, polrelid) as withcheck
from pg_policy where polrelid = 'public.credential_items'::regclass;
```

@madup.com update 정책이 컬럼 제한 없이 행 전체 update를 허용하면(현 스키마) 추가 조치 불필요. 만약 특정 컬럼 화이트리스트 트리거/정책이 있으면 신규 8개 컬럼을 허용 목록에 추가. (현 구현은 `is_madup()` 행 단위 정책이라 컬럼 제한 없음 → 조치 없음.)

- [ ] **Step 4: 적용 검증**

Supabase MCP `execute_sql`:

```sql
select count(*) filter (where is_featured) as featured,
       count(*) as total
from public.credential_items;
```

Expected: `featured=0`, `total=579` (신규 컬럼 존재·기본값 반영, 기존 행 무영향).

- [ ] **Step 5: 커밋 없음** (DB 변경, 코드 파일 없음). 다음 Task로.

---

### Task 2: types.ts — Item 필드 추가

**Files:**
- Modify: `web/src/types.ts:5-49`

- [ ] **Step 1: Item 인터페이스에 신규 필드 추가**

`web/src/types.ts`의 `updated_by: string | null;` 바로 다음(줄 48, 인터페이스 닫는 `}` 앞)에 삽입:

```typescript
  // Featured Case Studies (2026-07-19)
  is_featured?: boolean;
  featured_rank?: number | null;
  featured_headline?: string | null;
  featured_subcopy?: string | null;
  featured_kicker?: string | null;
  featured_cover?: string | null;
  // 상세 뷰 오버라이드
  custom_title?: string | null;
  custom_links?: { label: string; url: string }[] | null;
```

전부 optional(`?`)이라 기존 `filter.test.ts` 팩토리·컴포넌트는 무수정으로 통과.

- [ ] **Step 2: 타입 체크**

Run: `cd web && npx tsc -b --noEmit`
Expected: 에러 없음(PASS).

- [ ] **Step 3: 커밋**

```bash
git add web/src/types.ts
git commit -m "feat(types): Featured/상세 오버라이드 필드 추가"
```

---

### Task 3: lib/featured.ts — 선택·폴백 로직 (TDD)

**Files:**
- Create: `web/src/lib/featured.ts`
- Test: `web/test/featured.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `web/test/featured.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { selectFeatured, coverOf, headlineOf, subcopyOf, kickerOf } from "../src/lib/featured";
import type { Item } from "../src/types";

const it_ = (over: Partial<Item>): Item => ({
  id: "x", source_team: "PD", source_slide_id: "g", client: "메디힐", client_raw: "메디힐",
  client_matched: true, industry: "뷰티", category_group: "소비재", advertiser_type: "브랜드/서비스",
  advertiser_status: "confirmed", is_bidding: false, title: "선케어", overview: "o", year_month: "2026-04",
  media_type: "Video production", format: "Short form", content_type: [], production_team: "PD",
  production_method: "실촬영", tools: [], team: null, video_urls: [], asset_images: [], thumbnail: "t",
  ai_used: false, period_start: null, period_end: null, in_house: true, piece_count: 1,
  appeal_points: [], keywords: [], search_summary: "s", ai_confidence: null,
  custom_description: null, custom_tags: [], extra_images: [], creators: [],
  showcase_approved: true, updated_by: null, ...over,
});

describe("selectFeatured", () => {
  it("is_featured 만, rank 오름차순, hero=1위, tiles=2~5위", () => {
    const items = [
      it_({ id: "a", is_featured: true, featured_rank: 3 }),
      it_({ id: "b", is_featured: false, featured_rank: 1 }),
      it_({ id: "c", is_featured: true, featured_rank: 1 }),
      it_({ id: "d", is_featured: true, featured_rank: 2 }),
    ];
    const r = selectFeatured(items);
    expect(r.hero?.id).toBe("c");
    expect(r.tiles.map((i) => i.id)).toEqual(["d", "a"]);
  });
  it("6개 이상이면 상위 5개만(hero1+tiles4)", () => {
    const items = Array.from({ length: 7 }, (_, i) => it_({ id: String(i), is_featured: true, featured_rank: i + 1 }));
    const r = selectFeatured(items);
    expect(r.hero?.id).toBe("0");
    expect(r.tiles.map((i) => i.id)).toEqual(["1", "2", "3", "4"]);
  });
  it("featured 0개면 hero=null, tiles=[]", () => {
    expect(selectFeatured([it_({})])).toEqual({ hero: null, tiles: [] });
  });
  it("rank null 은 뒤로 밀림", () => {
    const items = [
      it_({ id: "a", is_featured: true, featured_rank: null }),
      it_({ id: "b", is_featured: true, featured_rank: 1 }),
    ];
    expect(selectFeatured(items).hero?.id).toBe("b");
  });
});

describe("폴백 헬퍼", () => {
  it("coverOf: featured_cover → thumbnail → asset_images[0]", () => {
    expect(coverOf(it_({ featured_cover: "fc" }))).toBe("fc");
    expect(coverOf(it_({ featured_cover: null, thumbnail: "th" }))).toBe("th");
    expect(coverOf(it_({ featured_cover: null, thumbnail: null, asset_images: ["a0"] }))).toBe("a0");
    expect(coverOf(it_({ featured_cover: null, thumbnail: null, asset_images: [] }))).toBe(null);
  });
  it("headlineOf: featured_headline → custom_title → client", () => {
    expect(headlineOf(it_({ featured_headline: "H" }))).toBe("H");
    expect(headlineOf(it_({ featured_headline: null, custom_title: "CT" }))).toBe("CT");
    expect(headlineOf(it_({ featured_headline: null, custom_title: null, client: "메디힐" }))).toBe("메디힐");
  });
  it("subcopyOf: featured_subcopy → 빈문자열", () => {
    expect(subcopyOf(it_({ featured_subcopy: "S" }))).toBe("S");
    expect(subcopyOf(it_({ featured_subcopy: null }))).toBe("");
  });
  it("kickerOf: featured_kicker → 자동생성", () => {
    expect(kickerOf(it_({ featured_kicker: "K" }))).toBe("K");
    expect(kickerOf(it_({ featured_kicker: null, client: "메디힐" }))).toBe("Featured Case Study · 메디힐");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run web/test/featured.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/featured'`.

- [ ] **Step 3: 구현**

Create `web/src/lib/featured.ts`:

```typescript
import type { Item } from "../types";

const rankOf = (i: Item) => (i.featured_rank == null ? 999 : i.featured_rank);

/** Featured 풀에서 hero(1위) + tiles(2~5위)를 뽑는다. is_featured 만, rank 오름차순, 최대 5개. */
export function selectFeatured(items: Item[]): { hero: Item | null; tiles: Item[] } {
  const pool = items
    .filter((i) => i.is_featured)
    .sort((a, b) => rankOf(a) - rankOf(b))
    .slice(0, 5);
  return { hero: pool[0] ?? null, tiles: pool.slice(1, 5) };
}

/** 타일/히어로 커버 이미지 */
export const coverOf = (i: Item): string | null =>
  i.featured_cover || i.thumbnail || i.asset_images?.[0] || null;

/** 문제-해결 헤드라인 */
export const headlineOf = (i: Item): string =>
  i.featured_headline || i.custom_title || i.client;

/** 보조 카피 / 히어로 리드 */
export const subcopyOf = (i: Item): string => i.featured_subcopy || "";

/** 히어로 키커 */
export const kickerOf = (i: Item): string =>
  i.featured_kicker || `Featured Case Study · ${i.client}`;
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run web/test/featured.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add web/src/lib/featured.ts web/test/featured.test.ts
git commit -m "feat(featured): 선택·폴백 로직 + 테스트"
```

---

### Task 4: lib/detail.ts — 상세 뷰 폴백 (TDD)

**Files:**
- Create: `web/src/lib/detail.ts`
- Test: `web/test/detail.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `web/test/detail.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { detailTitle, detailSubtitle, detailDesc, detailGallery, detailLinks } from "../src/lib/detail";
import type { Item } from "../src/types";

const it_ = (over: Partial<Item>): Item => ({
  id: "x", source_team: "PD", source_slide_id: "g", client: "메디힐", client_raw: "메디힐",
  client_matched: true, industry: "뷰티", category_group: "소비재", advertiser_type: "브랜드/서비스",
  advertiser_status: "confirmed", is_bidding: false, title: "선케어", overview: "개요", year_month: "2026-04",
  media_type: "Video production", format: "Short form", content_type: [], production_team: "PD",
  production_method: "실촬영", tools: [], team: null, video_urls: [], asset_images: [], thumbnail: null,
  ai_used: false, period_start: null, period_end: null, in_house: true, piece_count: 1,
  appeal_points: [], keywords: [], search_summary: "요약", ai_confidence: null,
  custom_description: null, custom_tags: [], extra_images: [], creators: [],
  showcase_approved: true, updated_by: null, ...over,
});

describe("detail 폴백", () => {
  it("detailTitle: custom_title → client", () => {
    expect(detailTitle(it_({ custom_title: "커스텀" }))).toBe("커스텀");
    expect(detailTitle(it_({ custom_title: null }))).toBe("메디힐");
  });
  it("detailSubtitle: media_type, format 결합", () => {
    expect(detailSubtitle(it_({}))).toBe("Video production, Short form");
    expect(detailSubtitle(it_({ format: null }))).toBe("Video production");
    expect(detailSubtitle(it_({ media_type: null, format: null }))).toBe("");
  });
  it("detailDesc: custom_description → overview → search_summary", () => {
    expect(detailDesc(it_({ custom_description: "설명" }))).toBe("설명");
    expect(detailDesc(it_({ custom_description: null }))).toBe("개요");
    expect(detailDesc(it_({ custom_description: null, overview: "" }))).toBe("요약");
  });
  it("detailGallery: asset+extra 합침, 없으면 thumbnail", () => {
    expect(detailGallery(it_({ asset_images: ["a"], extra_images: ["e"] }))).toEqual(["a", "e"]);
    expect(detailGallery(it_({ asset_images: [], extra_images: [], thumbnail: "t" }))).toEqual(["t"]);
    expect(detailGallery(it_({ asset_images: [], extra_images: [], thumbnail: null }))).toEqual([]);
  });
  it("detailLinks: custom_links 우선, 없으면 video_urls→'영상 보기 N'", () => {
    expect(detailLinks(it_({ custom_links: [{ label: "리뷰", url: "u1" }] }))).toEqual([{ label: "리뷰", url: "u1" }]);
    expect(detailLinks(it_({ video_urls: ["v1", "v2"] }))).toEqual([
      { label: "영상 보기 1", url: "v1" },
      { label: "영상 보기 2", url: "v2" },
    ]);
    expect(detailLinks(it_({ video_urls: ["v1"] }))).toEqual([{ label: "영상 보기", url: "v1" }]);
    expect(detailLinks(it_({}))).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run web/test/detail.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

Create `web/src/lib/detail.ts`:

```typescript
import type { Item } from "../types";

export interface DetailLink { label: string; url: string; }

export const detailTitle = (i: Item): string => i.custom_title || i.client;

export const detailSubtitle = (i: Item): string =>
  [i.media_type, i.format].filter(Boolean).join(", ");

export const detailDesc = (i: Item): string =>
  i.custom_description || i.overview || i.search_summary || "";

export const detailGallery = (i: Item): string[] => {
  const g = [...(i.asset_images ?? []), ...(i.extra_images ?? [])];
  if (g.length === 0 && i.thumbnail) g.push(i.thumbnail);
  return g;
};

export const detailLinks = (i: Item): DetailLink[] => {
  if (i.custom_links && i.custom_links.length > 0) return i.custom_links;
  const v = i.video_urls ?? [];
  return v.map((url, n) => ({ label: v.length > 1 ? `영상 보기 ${n + 1}` : "영상 보기", url }));
};
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run web/test/detail.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add web/src/lib/detail.ts web/test/detail.test.ts
git commit -m "feat(detail): 상세 뷰 필드 폴백 + 테스트"
```

---

### Task 5: useData — saveOverlay patch 타입 확장

**Files:**
- Modify: `web/src/lib/useData.ts:117-127`

- [ ] **Step 1: patch 타입에 신규 필드 추가**

`web/src/lib/useData.ts`의 `saveOverlay` 시그니처 `patch: Partial<Pick<Item, ...>>` 를 아래로 교체:

```typescript
export async function saveOverlay(
  id: string,
  patch: Partial<Pick<Item,
    | "custom_description" | "custom_tags" | "extra_images" | "creators" | "showcase_approved"
    | "media_type" | "format" | "production_method" | "production_team"
    | "is_featured" | "featured_rank" | "featured_headline" | "featured_subcopy"
    | "featured_kicker" | "featured_cover" | "custom_title" | "custom_links">>,
  email: string,
) {
```

(본문은 그대로 — 이미 generic patch update.)

- [ ] **Step 2: 타입 체크**

Run: `cd web && npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add web/src/lib/useData.ts
git commit -m "feat(useData): saveOverlay 에 Featured/오버라이드 필드 허용"
```

---

### Task 6: index.css — Featured 섹션 + DetailView 스타일

**Files:**
- Modify: `web/src/index.css` (파일 끝에 append)

- [ ] **Step 1: CSS 추가**

`web/src/index.css` 맨 끝에 append:

```css
/* ══════════ Featured Case Studies 섹션 ══════════ */
.featured { margin: 8px 0 30px; }
.featured-eyebrow { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; }
.featured-eyebrow .t { font-family: var(--serif); font-size: 22px; letter-spacing: -0.01em; white-space: nowrap; }
.featured-eyebrow .rule { flex: 1; height: 1px; background: var(--ink); opacity: 0.28; }

/* 히어로 — 풀 이미지 + 좌하단 오버레이 */
.fh { position: relative; overflow: hidden; min-height: 520px; cursor: pointer; }
.fh .img { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform 0.9s var(--ease); }
.fh:hover .img { transform: scale(1.04); }
.fh .scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,10,12,0.8) 0%, rgba(8,10,12,0.46) 44%, rgba(8,10,12,0.05) 80%); }
.fh .in { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-start; padding: 56px; color: #fff; z-index: 2; text-align: left; }
.fh .kicker { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; opacity: 0.9; margin-bottom: 16px; }
.fh h3 { font-size: clamp(30px, 3.4vw, 46px); line-height: 1.12; letter-spacing: -0.02em; font-weight: 800; max-width: 16em; }
.fh h3 i, .ft h4 i { font-family: var(--serif); font-style: italic; font-weight: 400; letter-spacing: 0; }
.fh .lead { margin-top: 18px; font-size: 15.5px; line-height: 1.7; max-width: 34em; color: rgba(255,255,255,0.86); }

/* 4타일 — 2스택+1+1, 갭 0, 직각 */
.ftiles { display: grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 0; height: 660px; }
.ft { position: relative; overflow: hidden; cursor: pointer; }
.ft .img { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform 0.8s var(--ease); }
.ft:hover .img { transform: scale(1.05); }
.ft .scrim { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8,10,12,0.66) 0%, rgba(8,10,12,0.14) 44%, rgba(8,10,12,0) 72%); }
.ft .txt { position: absolute; top: 0; left: 0; right: 0; padding: 30px 30px 0; color: #fff; z-index: 2; text-align: left; }
.ft h4 { font-size: 20px; font-weight: 800; letter-spacing: -0.01em; line-height: 1.28; }
.ft p { margin-top: 10px; font-size: 13.5px; line-height: 1.55; color: rgba(255,255,255,0.8); max-width: 22em; }
.ft.big { grid-row: span 2; }
.ft.c1 { grid-column: 1; grid-row: 1; } .ft.c4 { grid-column: 1; grid-row: 2; }
.ft.c2 { grid-column: 2; } .ft.c3 { grid-column: 3; }
@media (max-width: 900px) {
  .ftiles { grid-template-columns: 1fr 1fr; grid-template-rows: auto; height: auto; }
  .ft { min-height: 240px; } .ft.big { grid-row: auto; }
  .ft.c1,.ft.c2,.ft.c3,.ft.c4 { grid-column: auto; grid-row: auto; }
  .fh { min-height: 380px; } .fh .in { padding: 32px; }
}

/* ══════════ 통합 DetailView (다크 풀스크린) ══════════ */
.dv-back { position: fixed; inset: 0; z-index: 90; background: #0a0b0d; overflow-y: auto; }
.dv { max-width: 1320px; margin: 0 auto; min-height: 100vh; padding: 0 clamp(20px,4vw,60px) 90px; color: #f4f4f5; }
.dv-top { position: sticky; top: 0; z-index: 10; display: flex; justify-content: space-between; align-items: center; padding: 20px 0 16px; background: linear-gradient(180deg, #0a0b0d 70%, transparent); }
.dv-brand { font-size: 12.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #b6b7bb; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.14); padding: 8px 15px; border-radius: 10px; }
.dv-actions { display: flex; gap: 8px; align-items: center; }
.dv-close { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #f4f4f5; font-size: 17px; cursor: pointer; }
.dv-btn { padding: 8px 15px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #f4f4f5; font-size: 13px; font-weight: 700; cursor: pointer; }
.dv-btn.accent { background: var(--accent); border-color: transparent; color: #06231b; }

.dv-head { padding: 26px 0 34px; max-width: 60em; }
.dv-title { font-size: clamp(34px, 4vw, 56px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.02; }
.dv-subtitle { margin-top: 14px; font-size: 14px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #b6b7bb; }
.dv-desc { margin-top: 20px; font-size: 17px; line-height: 1.7; color: #dcdce0; max-width: 44em; white-space: pre-wrap; }
.dv-meta { margin-top: 22px; display: flex; gap: 8px; flex-wrap: wrap; }
.dv-chip { font-size: 12.5px; font-weight: 600; color: #f4f4f5; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); padding: 6px 13px; border-radius: 999px; }

.dv-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.dv-gallery a { display: block; }
.dv-gallery img { width: 100%; aspect-ratio: 9/13; object-fit: cover; display: block; }
@media (max-width: 720px) { .dv-gallery { grid-template-columns: 1fr 1fr; } }

.dv-links { margin-top: 30px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.14); }
.dv-links .lbl { font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #7a7c82; margin-bottom: 14px; }
.dv-links .row { display: flex; gap: 10px; flex-wrap: wrap; }
.dv-lbtn { display: inline-flex; align-items: center; gap: 7px; padding: 11px 18px; border-radius: 999px; background: #fff; color: #0a0b0d; font-weight: 700; font-size: 13.5px; cursor: pointer; transition: transform 0.2s var(--ease); }
.dv-lbtn:hover { transform: translateY(-2px); }
.dv-lbtn.ghost { background: transparent; color: #f4f4f5; border: 1px solid rgba(255,255,255,0.14); }

/* 편집 패널(다크) — 기존 .field/.input 재사용하되 다크 대비 */
.dv-edit { margin-top: 26px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.14); }
.dv-edit .field label { color: #b6b7bb; }
.dv-edit .input { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.16); color: #f4f4f5; }
.dv-edit .toggle-row { border-color: rgba(255,255,255,0.14); }
.dv-like { display: inline-flex; align-items: center; gap: 5px; padding: 8px 13px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: rgba(255,255,255,0.06); color: #f4f4f5; font-size: 13px; font-weight: 700; cursor: pointer; }
.dv-like.liked { color: #ff6b81; border-color: rgba(255,107,129,0.5); }
```

- [ ] **Step 2: 빌드 확인 (CSS 파싱)**

Run: `cd web && npx vite build`
Expected: 빌드 성공(기존 컴포넌트 무변경, CSS만 추가).

- [ ] **Step 3: 커밋**

```bash
git add web/src/index.css
git commit -m "style: Featured 섹션 + 통합 DetailView 다크 스타일"
```

---

### Task 7: FeaturedSection 컴포넌트

**Files:**
- Create: `web/src/components/FeaturedSection.tsx`

- [ ] **Step 1: 구현**

Create `web/src/components/FeaturedSection.tsx`:

```tsx
import type { Item } from "../types";
import { selectFeatured, coverOf, headlineOf, subcopyOf, kickerOf } from "../lib/featured";

/** 헤드라인 문자열의 *별표* 를 세리프 이탤릭으로 렌더 (예: "촬영 없이 *40종*") */
function Emph({ text }: { text: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return <>{parts.map((p, i) => (i % 2 === 1 ? <i key={i}>{p}</i> : <span key={i}>{p}</span>))}</>;
}

const bg = (src: string | null) =>
  src ? { backgroundImage: `url(${src})` } : { background: "radial-gradient(120% 120% at 60% 30%,#33434e,#0c1419)" };

function Hero({ item, onOpen }: { item: Item; onOpen: (i: Item) => void }) {
  return (
    <div className="fh" onClick={() => onOpen(item)}>
      <div className="img" style={bg(coverOf(item))} />
      <div className="scrim" />
      <div className="in">
        <div className="kicker">{kickerOf(item)}</div>
        <h3><Emph text={headlineOf(item)} /></h3>
        {subcopyOf(item) && <p className="lead">{subcopyOf(item)}</p>}
      </div>
    </div>
  );
}

function Tile({ item, cls, onOpen }: { item: Item; cls: string; onOpen: (i: Item) => void }) {
  return (
    <div className={"ft " + cls} onClick={() => onOpen(item)}>
      <div className="img" style={bg(coverOf(item))} />
      <div className="scrim" />
      <div className="txt">
        <h4><Emph text={headlineOf(item)} /></h4>
        {subcopyOf(item) && <p>{subcopyOf(item)}</p>}
      </div>
    </div>
  );
}

/** 대분류 표시: 좌열 스택(c1 위, c4 아래) + 중앙 c2(big) + 우 c3(big) */
const TILE_CLS = ["c1", "c2 big", "c3 big", "c4"];

export function FeaturedSection({ items, onOpen }: { items: Item[]; onOpen: (i: Item) => void }) {
  const { hero, tiles } = selectFeatured(items);
  if (!hero) return null;

  return (
    <section className="container featured">
      <div className="featured-eyebrow">
        <span className="t">Featured Case Studies</span>
        <span className="rule" />
      </div>
      <Hero item={hero} onOpen={onOpen} />
      {tiles.length > 0 && (
        <div className="ftiles">
          {tiles.map((t, i) => <Tile key={t.id} item={t} cls={TILE_CLS[i]} onOpen={onOpen} />)}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd web && npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add web/src/components/FeaturedSection.tsx
git commit -m "feat(FeaturedSection): 히어로+4타일 렌더"
```

---

### Task 8: DetailView 컴포넌트 (통합)

**Files:**
- Create: `web/src/components/DetailView.tsx`

CaseView(공개)와 ItemModal(편집·소셜)을 하나로 합친다. `Comments`·`TagEditor` 는 ItemModal에서 그대로 옮긴다.

- [ ] **Step 1: 구현**

Create `web/src/components/DetailView.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { Item } from "../types";
import { MEDIA_TAXONOMY, PRODUCTION_METHODS, PRODUCTION_TEAMS, SOURCE_TEAM_LABELS, tagsOf } from "../types";
import { saveOverlay, uploadExtraImage, fetchComments, addComment, deleteComment, type CommentRow } from "../lib/useData";
import { detailTitle, detailSubtitle, detailDesc, detailGallery, detailLinks } from "../lib/detail";

const nameOf = (email: string) => email.split("@")[0];
const timeOf = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Comments({ item, email, onChanged }: { item: Item; email: string | null; onChanged: () => void }) {
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setRows([]); setDraft("");
    void fetchComments(item.id).then(setRows).catch(() => setRows([]));
  }, [item.id]);
  const submit = async () => {
    const body = draft.trim();
    if (!body || !email) return;
    setBusy(true);
    try { await addComment(item.id, email, body); setDraft(""); setRows(await fetchComments(item.id)); onChanged(); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    setBusy(true);
    try { await deleteComment(id); setRows((r) => r.filter((c) => c.id !== id)); onChanged(); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ marginTop: 26, borderTop: "1px solid rgba(255,255,255,0.14)", paddingTop: 18 }}>
      <div style={{ fontWeight: 800, fontSize: 13.5 }}>코멘트 {rows.length > 0 && <span style={{ color: "#7a7c82", fontFamily: "var(--mono)", fontSize: 12 }}>{rows.length}</span>}</div>
      <div className="cmt-list">
        {rows.map((c) => (
          <div key={c.id} className="cmt">
            <div className="cmt-avatar">{nameOf(c.author_email).slice(0, 2)}</div>
            <div className="cmt-body">
              <div className="cmt-head">
                <span className="cmt-author">{nameOf(c.author_email)}</span>
                <span className="cmt-time">{timeOf(c.created_at)}</span>
                {email === c.author_email && <button className="cmt-del" onClick={() => void remove(c.id)} disabled={busy}>삭제</button>}
              </div>
              <div className="cmt-text">{c.body}</div>
            </div>
          </div>
        ))}
        {rows.length === 0 && <div style={{ fontSize: 12.5, color: "#7a7c82" }}>첫 코멘트를 남겨보세요.</div>}
      </div>
      <div className="cmt-form">
        <input className="input" placeholder="코멘트 입력 후 Enter" value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }} />
        <button className="dv-btn" onClick={() => void submit()} disabled={busy || !draft.trim()}>등록</button>
      </div>
    </div>
  );
}

function TagEditor({ tags, setTags }: { tags: string[]; setTags: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim().replace(/^#/, "");
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setDraft("");
  };
  return (
    <div className="tagbox">
      {tags.map((t) => (
        <button key={t} className="tg" onClick={() => setTags(tags.filter((x) => x !== t))} title="클릭해서 제거">#{t} ✕</button>
      ))}
      <input value={draft} placeholder="태그 입력 후 Enter" onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} onBlur={add} />
    </div>
  );
}

export function DetailView({ item, onClose, staff, email, onSaved, likers = [], onToggleLike, onSocialChanged }: {
  item: Item | null;
  onClose: () => void;
  staff: boolean;
  email: string | null;
  onSaved: () => void;
  likers?: string[];
  onToggleLike?: (i: Item) => void;
  onSocialChanged?: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const [desc, setDesc] = useState("");
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [creators, setCreators] = useState("");
  const [approved, setApproved] = useState(false);
  const [media, setMedia] = useState("");
  const [fmt, setFmt] = useState("");
  const [method, setMethod] = useState("");
  const [pteam, setPteam] = useState("");
  // featured
  const [feat, setFeat] = useState(false);
  const [rank, setRank] = useState<string>("");
  const [headline, setHeadline] = useState("");
  const [subcopy, setSubcopy] = useState("");
  const [kicker, setKicker] = useState("");
  const [cover, setCover] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setEdit(false); setErr(null);
    setDesc(item.custom_description ?? "");
    setTitle(item.custom_title ?? "");
    setTags(item.custom_tags ?? []);
    setCreators((item.creators ?? []).join(", "));
    setApproved(item.showcase_approved);
    setMedia(item.media_type ?? "");
    setFmt(item.format ?? "");
    setMethod(item.production_method ?? "");
    setPteam(item.production_team ?? "");
    setFeat(item.is_featured ?? false);
    setRank(item.featured_rank != null ? String(item.featured_rank) : "");
    setHeadline(item.featured_headline ?? "");
    setSubcopy(item.featured_subcopy ?? "");
    setKicker(item.featured_kicker ?? "");
    setCover(item.featured_cover ?? "");
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [item, onClose]);

  if (!item) return null;

  const gallery = detailGallery(item);
  const links = detailLinks(item);
  const liked = !!email && likers.includes(email);

  const save = async () => {
    if (!email) return;
    setBusy(true); setErr(null);
    try {
      await saveOverlay(item.id, {
        custom_description: desc || null,
        custom_title: title || null,
        custom_tags: tags,
        creators: creators.split(",").map((s) => s.trim()).filter(Boolean),
        showcase_approved: approved,
        media_type: media || null,
        format: fmt || null,
        production_method: method || null,
        production_team: pteam || null,
        is_featured: feat,
        featured_rank: feat && rank ? Number(rank) : null,
        featured_headline: headline || null,
        featured_subcopy: subcopy || null,
        featured_kicker: kicker || null,
        featured_cover: cover || null,
      }, email);
      onSaved();
      setEdit(false);
    } catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
  };

  const upload = async (file: File) => {
    if (!email) return;
    setBusy(true); setErr(null);
    try {
      const url = await uploadExtraImage(item.id, file);
      await saveOverlay(item.id, { extra_images: [...(item.extra_images ?? []), url] }, email);
      onSaved();
    } catch (e) { setErr(String((e as Error).message)); }
    setBusy(false);
  };

  return (
    <div className="dv-back" onClick={onClose}>
      <div className="dv" onClick={(e) => e.stopPropagation()}>
        <div className="dv-top">
          <span className="dv-brand">MADUP — Selected Work</span>
          <div className="dv-actions">
            {onToggleLike && email && (
              <button className={"dv-like" + (liked ? " liked" : "")} onClick={() => onToggleLike(item)} aria-label="좋아요">
                ♥ {likers.length > 0 && likers.length}
              </button>
            )}
            {staff && !edit && <button className="dv-btn" onClick={() => setEdit(true)}>✎ 편집</button>}
            <button className="dv-close" onClick={onClose} aria-label="닫기">✕</button>
          </div>
        </div>

        {!edit && (
          <>
            <div className="dv-head">
              <h1 className="dv-title">{detailTitle(item)}</h1>
              {detailSubtitle(item) && <div className="dv-subtitle">{detailSubtitle(item)}</div>}
              {detailDesc(item) && <p className="dv-desc">{detailDesc(item)}</p>}
              <div className="dv-meta">
                {item.year_month && <span className="dv-chip">{item.year_month}</span>}
                <span className="dv-chip">{SOURCE_TEAM_LABELS[item.source_team]}</span>
                {item.production_method && <span className="dv-chip">{item.production_method}</span>}
                {item.industry && <span className="dv-chip">{item.industry}</span>}
                {item.piece_count != null && <span className="dv-chip">{item.piece_count}편</span>}
                {item.is_bidding && <span className="dv-chip">비딩 제안</span>}
                {tagsOf(item).slice(0, 6).map((t) => <span key={t} className="dv-chip">#{t}</span>)}
              </div>
            </div>

            {gallery.length > 0 && (
              <div className="dv-gallery">
                {gallery.map((src) => (
                  <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt={item.client} loading="lazy" /></a>
                ))}
              </div>
            )}

            {links.length > 0 && (
              <div className="dv-links">
                <div className="lbl">상세 · 링크</div>
                <div className="row">
                  {links.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="dv-lbtn">{l.label} ↗</a>
                  ))}
                  {item.asset_images?.length > 0 && item.thumbnail && (
                    <a className="dv-lbtn ghost" href={item.thumbnail} target="_blank" rel="noreferrer">원본 슬라이드 ↗</a>
                  )}
                </div>
              </div>
            )}

            {email && <Comments item={item} email={email} onChanged={() => onSocialChanged?.()} />}
            {staff && (
              <label className="dv-btn" style={{ cursor: "pointer", marginTop: 18, display: "inline-block" }}>
                이미지 추가
                <input type="file" accept="image/*" style={{ display: "none" }}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
              </label>
            )}
          </>
        )}

        {edit && staff && (
          <div className="dv-edit">
            <div className="toggle-row">
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Showcase 외부 공개</div>
                <div className="hint">동의된 소재만 외부(비로그인)에 노출됩니다</div>
              </div>
              <button className={"dv-btn" + (approved ? " accent" : "")} onClick={() => setApproved(!approved)}>{approved ? "공개 중" : "비공개"}</button>
            </div>

            <div className="toggle-row" style={{ marginTop: 10 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Featured Case Study</div>
                <div className="hint">{feat && !approved ? "⚠ 공개 승인해야 외부에 노출됩니다" : "메인 상단 Featured 섹션에 노출 (최대 5개)"}</div>
              </div>
              <button className={"dv-btn" + (feat ? " accent" : "")} onClick={() => setFeat(!feat)}>{feat ? "Featured" : "일반"}</button>
            </div>

            {feat && (
              <>
                <div className="field">
                  <label>순서 (1=히어로 · 2~5=타일)</label>
                  <select className="input" value={rank} onChange={(e) => setRank(e.target.value)}>
                    <option value="">순서 선택</option>
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n === 1 ? "1 (히어로)" : `${n} (타일)`}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>헤드라인 (문제-해결 · *별표*는 이탤릭 강조)</label>
                  <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="모델 계약 없이, *심의를 통과한* 건기식 캠페인" />
                </div>
                <div className="field">
                  <label>보조 카피 / 히어로 리드</label>
                  <textarea className="input" rows={2} value={subcopy} onChange={(e) => setSubcopy(e.target.value)} placeholder="한 줄 요약 (타일) 또는 리드 문단 (히어로)" />
                </div>
                <div className="field">
                  <label>키커 (히어로 · 익명화 가능)</label>
                  <input className="input" value={kicker} onChange={(e) => setKicker(e.target.value)} placeholder="Featured Case Study · 헬스케어 D사" />
                </div>
                <div className="field">
                  <label>커버 이미지</label>
                  <select className="input" value={cover} onChange={(e) => setCover(e.target.value)}>
                    <option value="">기본(썸네일/첫 이미지)</option>
                    {detailGallery(item).map((src, i) => <option key={src} value={src}>이미지 {i + 1}</option>)}
                  </select>
                </div>
              </>
            )}

            <div className="field">
              <label>타이틀 (상세 뷰 · 비우면 광고주명)</label>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={item.client} />
            </div>
            <div className="field">
              <label>소재타입</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select className="input" value={media} onChange={(e) => { setMedia(e.target.value); setFmt(MEDIA_TAXONOMY[e.target.value]?.[0] ?? ""); }}>
                  <option value="">대분류 선택</option>
                  {Object.keys(MEDIA_TAXONOMY).map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select className="input" value={fmt} onChange={(e) => setFmt(e.target.value)} disabled={!media}>
                  <option value="">세부 선택</option>
                  {(MEDIA_TAXONOMY[media] ?? []).map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>제작방식 · 제작팀</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select className="input" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="">제작방식 선택</option>
                  {PRODUCTION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <select className="input" value={pteam} onChange={(e) => setPteam(e.target.value)}>
                  <option value="">제작팀 선택</option>
                  {PRODUCTION_TEAMS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="field">
              <label>설명 (상세 소개)</label>
              <textarea className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={item.overview || "이 소재에 대한 설명"} />
            </div>
            <div className="field">
              <label>태그 (복수 입력)</label>
              <TagEditor tags={tags} setTags={setTags} />
            </div>
            <div className="field">
              <label>크리에이터 (쉼표로 구분)</label>
              <input className="input" value={creators} onChange={(e) => setCreators(e.target.value)} placeholder="홍길동, 김제작" />
            </div>
            {err && <div className="err">{err}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="dv-btn accent" onClick={() => void save()} disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
              <button className="dv-btn" onClick={() => setEdit(false)} disabled={busy}>취소</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입 체크**

Run: `cd web && npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: 커밋**

```bash
git add web/src/components/DetailView.tsx
git commit -m "feat(DetailView): CaseView+ItemModal 통합 스택형 상세(편집·소셜·Featured 컨트롤)"
```

---

### Task 9: Showcase 와이어링 (FeaturedSection + DetailView)

**Files:**
- Modify: `web/src/pages/Showcase.tsx`

- [ ] **Step 1: import 교체**

`web/src/pages/Showcase.tsx` 상단 import 에서 `CaseView` 줄을 제거하고 아래 2줄 추가:

```tsx
import { DetailView } from "../components/DetailView";
import { FeaturedSection } from "../components/FeaturedSection";
```

(`import { CaseView } from "../components/CaseView";` 삭제)

- [ ] **Step 2: FeaturedSection 삽입 + CaseView 교체**

`Showcase` 컴포넌트 `return` 안에서 `<MiddleStatement />` 와 그 아래 조건부 블록 사이에 FeaturedSection을 넣고, 맨 아래 `<CaseView ... />` 를 `<DetailView ... />` 로 교체. 최종 return 은 다음과 같다:

```tsx
  return (
    <>
      <HeroCarousel />
      <HeroReel />
      <MiddleStatement />

      <FeaturedSection items={pool} onOpen={setOpen} />

      {!loading && pool.length === 0 ? (
        <div className="container empty">
          <div className="big">Coming soon</div>
          <p>공개 승인된 소재가 준비되는 대로 이곳에 전시됩니다.{staff ? " — Explore에서 소재를 열어 'Showcase 외부 공개'를 켜면 나타납니다." : ""}</p>
        </div>
      ) : (
        <>
          <FilterBar items={pool} filters={filters} setFilters={setFilters} resultCount={filtered.length} title="Selected work" hideTeamBidding />
          <WorkGrid items={filtered} onOpen={setOpen} loading={loading} />
        </>
      )}
      <DetailView item={open} onClose={() => setOpen(null)} staff={staff} email={email}
        onSaved={() => { onSaved(); setOpen(null); }} />
    </>
  );
```

`Showcase` 의 props 는 이미 `staff`, `email`, `onSaved` 를 받으므로 시그니처 변경 불필요.

- [ ] **Step 3: 타입 체크**

Run: `cd web && npx tsc -b --noEmit`
Expected: PASS (CaseView import 제거로 미사용 경고도 없음).

- [ ] **Step 4: 커밋**

```bash
git add web/src/pages/Showcase.tsx
git commit -m "feat(Showcase): FeaturedSection 삽입 + DetailView 로 교체"
```

---

### Task 10: Explore 와이어링 (DetailView)

**Files:**
- Modify: `web/src/pages/Explore.tsx:8`, `:73-77`

- [ ] **Step 1: import 교체**

`import { ItemModal } from "../components/ItemModal";` → `import { DetailView } from "../components/DetailView";`

- [ ] **Step 2: 컴포넌트 교체**

`return` 안 `<ItemModal ... />` 를 아래로 교체:

```tsx
      <DetailView item={open} onClose={() => setOpen(null)} staff={staff} email={email}
        onSaved={() => { onSaved(); setOpen(null); }}
        likers={open ? social.likes[open.id] ?? [] : []}
        onToggleLike={handleLike}
        onSocialChanged={() => void reloadSocial()} />
```

- [ ] **Step 3: 타입 체크**

Run: `cd web && npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 4: 커밋**

```bash
git add web/src/pages/Explore.tsx
git commit -m "feat(Explore): ItemModal → DetailView"
```

---

### Task 11: 구 컴포넌트 삭제

**Files:**
- Delete: `web/src/components/CaseView.tsx`, `web/src/components/ItemModal.tsx`

- [ ] **Step 1: 참조 없음 확인**

Run: `cd web && grep -rn "CaseView\|ItemModal" src`
Expected: 출력 없음(모두 DetailView 로 교체됨).

- [ ] **Step 2: 삭제**

```bash
git rm web/src/components/CaseView.tsx web/src/components/ItemModal.tsx
```

- [ ] **Step 3: 빌드 + 전체 테스트**

Run: `cd web && npx tsc -b --noEmit && npx vite build`
Expected: 빌드 성공.
Run: `npx vitest run` (리포 루트)
Expected: 기존 + featured + detail 테스트 전부 PASS.

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "refactor: CaseView·ItemModal 제거 (DetailView 로 통합)"
```

---

### Task 12: 브라우저 E2E 검증 + 시드 데이터

**Files:** 없음 (검증)

- [ ] **Step 1: dev 서버 프리뷰**

`.claude/launch.json` 의 dev 서버(`preview_start {name}`)로 로컬 실행. Showcase(`/`) 진입.

- [ ] **Step 2: Featured 미지정 상태 확인**

featured 0개이므로 Featured 섹션이 **렌더되지 않음**(FilterBar+그리드는 정상). read_page 로 "Featured Case Studies" 미존재 확인.

- [ ] **Step 3: 시드 — 스태프로 5개 지정**

로그인(@madup.com) 후 Explore/Showcase에서 항목 5개를 열어 편집모드 → Featured 토글 ON → 순서 1~5 → 헤드라인/보조/커버 입력 → 저장. (또는 Supabase MCP `execute_sql` 로 임의 5행 `update ... set is_featured=true, featured_rank=n, featured_headline=..., showcase_approved=true`.)

- [ ] **Step 4: Featured 섹션 렌더 확인**

Showcase 새로고침 → 중간카피 아래·필터 위에 히어로1+타일4 노출. read_page 로 헤드라인 텍스트·타일 4개 확인. `computer` 스크린샷으로 시각 확인.

- [ ] **Step 5: DetailView 확인**

히어로/타일/그리드 카드 클릭 → 다크 DetailView 가 타이틀→서브→설명→메타→이미지→링크 순으로 열림. 스태프면 ✎ 편집·코멘트 노출, 비로그인이면 읽기 전용. read_console_messages 로 에러 0 확인.

- [ ] **Step 6: 최종 커밋(있으면) + 완료 보고**

시각 검증 스크린샷을 사용자에게 제시. sync 파이프라인이 `catalog.*.json` 재생성 시 신규 컬럼을 덮지 않는지(현 sync 는 편집 레이어를 건드리지 않음) 확인 노트.

---

## Self-Review (작성자 체크)

- **Spec coverage**: 섹션3(Featured 레이아웃)→Task6/7, 섹션4(통합 DetailView)→Task8, 섹션5(데이터 모델)→Task1/2/5, 섹션6(컴포넌트·파일)→Task6~11, 섹션7(엣지)→Task3(selectFeatured 0/부분·rank), Task4(폴백), Task8(이미지·링크 0 숨김), 섹션9(테스트)→Task3/4 단위 + Task11/12 빌드·E2E. 모두 대응.
- **Placeholder scan**: 코드·명령·기대출력 모두 구체값. TBD 없음.
- **Type 일관성**: `selectFeatured`/`coverOf`/`headlineOf`/`subcopyOf`/`kickerOf`(featured.ts), `detailTitle`/`detailSubtitle`/`detailDesc`/`detailGallery`/`detailLinks`(detail.ts), `saveOverlay` patch 필드 — Task 간 동일 명칭 사용. `Item` 신규 필드명 = 마이그레이션 컬럼명 일치(is_featured/featured_rank/featured_headline/featured_subcopy/featured_kicker/featured_cover/custom_title/custom_links).
- **주의**: 컴포넌트 렌더 단위 테스트는 node 환경이라 미작성 — 빌드+브라우저로 검증(설계 §9 명시).
