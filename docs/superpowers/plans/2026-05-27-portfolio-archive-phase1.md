# 포트폴리오 아카이브 Phase 1 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글슬라이드 포트폴리오를 읽어 `catalog.json`으로 만드는 동기화 파이프라인과, 그 catalog를 필터·자연어 검색·통계로 탐색하는 정적 웹 갤러리를 구축한다 (Phase 1 MVP).

**Architecture:** TypeScript 단일 언어. ① Node 동기화 스크립트(Google Slides API로 추출 → Claude API로 분류 → catalog 산출), ② Vite+React 정적 웹, ③ Vercel 서버리스 함수 1개(`/api/search`, Claude 키 보유). `catalog.public.json`이 웹·검색의 단일 진실원천.

**Tech Stack:** TypeScript, Node 20, `googleapis`(Slides+Drive), `@anthropic-ai/sdk`, Vite, React, Vitest, Vercel.

**설계 문서:** `docs/superpowers/specs/2026-05-27-portfolio-archive-design.md`

**참고 — 시각 디자인:** 본 계획은 기능 동작이 목표다. 카드·갤러리의 시각 완성도(타이포·여백·컬러)는 실행 단계에서 taste-skill/soft-skill로 시안 비교 후 별도 패스로 다듬는다. 본 계획의 컴포넌트 코드는 동작하는 기준선이다.

---

## 파일 구조

```
portfolio-archive/
  package.json                 # 루트 (npm workspaces: sync, web, api 공용 스크립트)
  .env                         # GOOGLE_*, ANTHROPIC_API_KEY (git ignore)
  .gitignore
  data/
    catalog.public.json        # 배포용 (금액 제외)
    catalog.internal.json      # 내부용 (전체 필드)
    thumbnails/                # 추출된 썸네일 이미지
  sync/
    src/
      types.ts                 # PortfolioItem 등 공용 타입
      vocab.ts                 # 통제 어휘 시드 (업종/포맷/무드)
      slidesClient.ts          # I/O: OAuth + presentation 가져오기 + 썸네일 다운로드
      parseSlide.ts            # 순수: 슬라이드 JSON → 파싱 필드
      classify.ts              # Claude 분류 (프롬프트 빌더는 순수, 호출은 I/O)
      buildCatalog.ts          # 오케스트레이션: fetch→parse→diff→classify→write
    scripts/
      dump-presentation.ts     # 검증 스파이크 + fixture 캡처
    test/
      parseSlide.test.ts
      classify.test.ts
      fixtures/
        sample-presentation.json
  web/                         # Vite + React + TS (npm create vite)
    src/
      types.ts                 # sync/src/types.ts 재노출(심볼릭) — 동일 타입
      lib/filter.ts            # 순수: 필터 적용 + 키워드 매칭
      components/
        Card.tsx
        Gallery.tsx
        FilterSidebar.tsx
        SearchBar.tsx
        StatsPanel.tsx
        DetailModal.tsx
        AccuracyBadge.tsx
      App.tsx
    test/
      filter.test.ts
    public/
      catalog.public.json      # 빌드 시 data/에서 복사
      thumbnails/
  api/
    search.ts                  # Vercel 서버리스: 질의 + catalog → Claude 랭킹
  vercel.json
```

---

## Task 1: 프로젝트 셋업 + Google 인증 + 추출 검증 스파이크

이 Task는 spec의 "구현 전 검증 미지수 1~3"을 해소한다. **이 Task가 통과해야 나머지가 의미 있다.**

**Files:**
- Create: `package.json`, `.gitignore`, `.env.example`, `sync/src/slidesClient.ts`, `sync/scripts/dump-presentation.ts`

- [ ] **Step 1: 루트 package.json 생성**

```json
{
  "name": "portfolio-archive",
  "private": true,
  "type": "module",
  "workspaces": ["sync", "web", "api"],
  "scripts": {
    "sync": "tsx sync/src/buildCatalog.ts",
    "dump": "tsx sync/scripts/dump-presentation.ts"
  },
  "devDependencies": {
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "dependencies": {
    "googleapis": "^144.0.0",
    "@anthropic-ai/sdk": "^0.30.0",
    "dotenv": "^16.4.0"
  }
}
```

- [ ] **Step 2: .gitignore, .env.example 생성**

`.gitignore`:
```
node_modules/
.env
data/catalog.internal.json
*.log
.vercel
google-token.json
```

`.env.example`:
```
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
PRESENTATION_ID=1gkATsneTHnLjxJLhVnTF0GiZKAab8WMYt7843uJ03ZE
ANTHROPIC_API_KEY=
```

- [ ] **Step 3: 의존성 설치**

Run: `npm install`
Expected: `node_modules/` 생성, 에러 없음.

- [ ] **Step 4: Google OAuth 클라이언트 준비 (수동, 1회)**

사용자/실행자 안내 — 다음을 수행한 뒤 `.env`에 값 입력:
1. Google Cloud Console → 새 프로젝트 → "Google Slides API"와 "Google Drive API" 사용 설정.
2. OAuth 동의 화면(외부, 테스트 사용자에 본인 계정 추가) 구성.
3. 사용자 인증 정보 → OAuth 클라이언트 ID(데스크톱 앱) 생성 → Client ID/Secret을 `.env`에 입력.
4. 대상 프레젠테이션이 해당 Google 계정에 공유되어 있어야 함 (이미 공유됨: shinycoral 계정).

- [ ] **Step 5: slidesClient.ts — OAuth + presentation fetch (I/O)**

```typescript
// sync/src/slidesClient.ts
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import * as fs from "node:fs";
import * as readline from "node:readline/promises";

const TOKEN_PATH = "google-token.json";
const SCOPES = [
  "https://www.googleapis.com/auth/presentations.readonly",
  "https://www.googleapis.com/auth/drive.readonly",
];

async function getAuth(): Promise<OAuth2Client> {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_OAUTH_CLIENT_ID,
    process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob",
  );
  if (fs.existsSync(TOKEN_PATH)) {
    client.setCredentials(JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8")));
    return client;
  }
  const url = client.generateAuthUrl({ access_type: "offline", scope: SCOPES });
  console.log("이 URL을 브라우저에서 열고 인증 코드를 붙여넣으세요:\n", url);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const code = (await rl.question("코드: ")).trim();
  rl.close();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  return client;
}

export async function fetchPresentation(presentationId: string) {
  const auth = await getAuth();
  const slides = google.slides({ version: "v1", auth });
  const res = await slides.presentations.get({ presentationId });
  return res.data; // Schema$Presentation
}
```

- [ ] **Step 6: dump-presentation.ts — 검증 스파이크**

```typescript
// sync/scripts/dump-presentation.ts
import "dotenv/config";
import * as fs from "node:fs";
import { fetchPresentation } from "../src/slidesClient.js";

const id = process.env.PRESENTATION_ID!;
const pres = await fetchPresentation(id);
fs.mkdirSync("sync/test/fixtures", { recursive: true });
fs.writeFileSync("sync/test/fixtures/sample-presentation.json", JSON.stringify(pres, null, 2));

const slides = pres.slides ?? [];
console.log(`총 슬라이드: ${slides.length}`);
// 프로젝트 상세 슬라이드 하나를 골라 구조 확인 (텍스트/이미지/링크)
for (const slide of slides.slice(0, 12)) {
  const texts: string[] = [];
  let imageWithLink = 0;
  for (const el of slide.pageElements ?? []) {
    const t = el.shape?.text?.textElements
      ?.map((te) => te.textRun?.content ?? "")
      .join("");
    if (t?.trim()) texts.push(t.trim());
    if (el.image) {
      const link = el.image.imageProperties?.link?.url ?? (el as any).link?.url;
      if (link) imageWithLink++;
      console.log("  image contentUrl:", el.image.contentUrl?.slice(0, 60), "link:", link ?? "(none)");
    }
  }
  console.log(`slide ${slide.objectId}: 텍스트 ${texts.length}블록, 링크걸린이미지 ${imageWithLink}`);
}
```

- [ ] **Step 7: 스파이크 실행 — 추출 가능성 확인**

Run: `npm run dump`
Expected (수동 확인):
- 총 슬라이드 약 204개 출력.
- 프로젝트 상세 슬라이드에서 "광고주:", "프로젝트:", "개요:" 텍스트 블록이 보임.
- **이미지에 hyperlink(영상 URL)가 붙어 추출됨** (link 값이 (none)이 아님).
- `sync/test/fixtures/sample-presentation.json` 생성됨.

**판단 게이트:** 텍스트·이미지 링크가 추출되면 계속. 링크가 element-level(`el.link.url`)인지 image-property-level인지 기록하고 parseSlide에서 그 경로를 사용. 만약 링크가 전혀 안 나오면 → 멈추고 재계획(슬라이드가 링크를 텍스트로만 갖고 있을 가능성 등).

- [ ] **Step 8: 커밋**

```bash
git add package.json .gitignore .env.example sync/src/slidesClient.ts sync/scripts/dump-presentation.ts
git commit -m "feat(sync): google slides 인증 및 추출 검증 스파이크"
```

---

## Task 2: 공용 타입 + 통제 어휘

**Files:**
- Create: `sync/src/types.ts`, `sync/src/vocab.ts`

- [ ] **Step 1: types.ts 작성**

```typescript
// sync/src/types.ts
export type ContentType = "촬영숏폼" | "스틸사진" | "AI영상";

export interface ParsedFields {
  client: string;
  project_title: string;
  overview: string;
  period_start: string | null; // YYYY-MM-DD
  period_end: string | null;
  year_month: string | null;   // YYYY-MM
  in_house: boolean | null;
  piece_count: number | null;
  billing_amount: number | null; // KRW, 민감
  content_type: ContentType[];
  ai_used: boolean;
  video_url: string | null;
  thumbnail: string | null;    // 상대경로
}

export interface AiFields {
  industry: string;
  format_concept: string[];
  mood: string[];
  keywords: string[];
  search_summary: string;
  _ai_confidence: "estimated";
}

export interface PortfolioItem extends ParsedFields, AiFields {
  id: string;
  source_slide_id: string;
}

// 공개용: billing_amount 제거
export type PublicPortfolioItem = Omit<PortfolioItem, "billing_amount">;
```

- [ ] **Step 2: vocab.ts 작성 (슬라이드에서 관찰된 시드)**

```typescript
// sync/src/vocab.ts
export const INDUSTRIES = [
  "뷰티", "세무·핀테크", "식품", "헬스케어", "이커머스", "기타",
] as const;

export const FORMATS = [
  "인터뷰형", "브이로그형", "스케치코미디", "뉴스형", "메이킹필름",
  "릴스형", "공감형", "제품소개형",
] as const;

export const MOODS = [
  "감성", "유머", "정보전달", "진정성", "역동적", "트렌디",
] as const;
```

- [ ] **Step 3: 커밋**

```bash
git add sync/src/types.ts sync/src/vocab.ts
git commit -m "feat(sync): 공용 타입 및 통제 어휘 시드"
```

---

## Task 3: parseSlide — 슬라이드 JSON → 파싱 필드 (TDD, 순수 함수)

fixture(Task 1에서 캡처)와 합성 입력으로 테스트한다. Task 1 Step 7에서 확인한 실제 링크 경로를 반영한다.

**Files:**
- Create: `sync/src/parseSlide.ts`, `sync/test/parseSlide.test.ts`
- Create: `vitest.config.ts` (루트)

- [ ] **Step 1: vitest 설정**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { globals: true, environment: "node" } });
```

- [ ] **Step 2: 실패하는 테스트 작성**

```typescript
// sync/test/parseSlide.test.ts
import { describe, it, expect } from "vitest";
import { parseSlide, isProjectSlide } from "../src/parseSlide.js";

const makeSlide = (lines: string[], link?: string) => ({
  objectId: "g123",
  pageElements: [
    {
      objectId: "txt1",
      shape: { text: { textElements: lines.map((l) => ({ textRun: { content: l + "\n" } })) } },
    },
    {
      objectId: "img1",
      image: { contentUrl: "https://img", ...(link ? { } : {}) },
      ...(link ? { link: { url: link } } : {}),
    },
  ],
});

describe("isProjectSlide", () => {
  it("광고주: 가 있으면 프로젝트 슬라이드", () => {
    expect(isProjectSlide(makeSlide(["광고주: 메디힐", "프로젝트: X"]) as any)).toBe(true);
  });
  it("섹션 구분 슬라이드는 아님", () => {
    expect(isProjectSlide(makeSlide(["메디힐"]) as any)).toBe(false);
  });
});

describe("parseSlide", () => {
  it("필드와 영상 링크를 추출한다", () => {
    const slide = makeSlide(
      [
        "광고주: 비즈넵 케어",
        "프로젝트: 비즈넵 케어 인터뷰형 숏폼 제작 건(8)",
        "프로젝트 개요: 사업하는 친구와 세금 관리 얘기",
        "제작 기간: 26.01.30-26.03.14 (최종 납품일 기준)",
        "외주 여부: 내부 제작(기획 및 촬영·편집 일체)",
        "총 제작 편 수: 1편 (vari.건 제외, 메인안 기준)",
        "광고주 청구 금액(제작비): 250만원(인터뷰형 숏폼 1종 기준)",
        "숏폼",
      ],
      "https://youtu.be/abc",
    );
    const r = parseSlide(slide as any);
    expect(r.client).toBe("비즈넵 케어");
    expect(r.project_title).toContain("인터뷰형 숏폼");
    expect(r.period_start).toBe("2026-01-30");
    expect(r.period_end).toBe("2026-03-14");
    expect(r.year_month).toBe("2026-03");
    expect(r.in_house).toBe(true);
    expect(r.piece_count).toBe(1);
    expect(r.billing_amount).toBe(2500000);
    expect(r.content_type).toContain("촬영숏폼");
    expect(r.ai_used).toBe(false);
    expect(r.video_url).toBe("https://youtu.be/abc");
  });

  it("AI활용 표기를 잡는다", () => {
    const slide = makeSlide(["광고주: CJ웰케어", "프로젝트: 멜라메이트", "AI활용", "숏폼"]);
    expect(parseSlide(slide as any).ai_used).toBe(true);
  });
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `npx vitest run sync/test/parseSlide.test.ts`
Expected: FAIL — `parseSlide`/`isProjectSlide` 미정의.

- [ ] **Step 4: parseSlide.ts 구현**

> 주의: `linkUrl` 추출 경로는 Task 1 Step 7에서 확인한 실제 위치(`el.link?.url` vs `el.image?.imageProperties?.link?.url`)에 맞춘다. 아래는 두 경로 모두 시도한다.

```typescript
// sync/src/parseSlide.ts
import type { ParsedFields, ContentType } from "./types.js";

interface SlideEl {
  objectId?: string;
  link?: { url?: string };
  shape?: { text?: { textElements?: { textRun?: { content?: string } }[] } };
  image?: { contentUrl?: string; imageProperties?: { link?: { url?: string } } };
}
interface Slide { objectId?: string; pageElements?: SlideEl[] }

function slideText(slide: Slide): string {
  const blocks: string[] = [];
  for (const el of slide.pageElements ?? []) {
    const t = el.shape?.text?.textElements?.map((te) => te.textRun?.content ?? "").join("");
    if (t) blocks.push(t);
  }
  return blocks.join("\n");
}

export function isProjectSlide(slide: Slide): boolean {
  return /광고주\s*[:：]/.test(slideText(slide));
}

function field(text: string, label: string): string | null {
  const re = new RegExp(label + "\\s*[:：]\\s*(.+)");
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

function toIsoDate(yymmdd: string): string | null {
  const m = yymmdd.match(/(\d{2})\.(\d{2})\.(\d{2})/);
  if (!m) return null;
  return `20${m[1]}-${m[2]}-${m[3]}`;
}

function parsePeriod(text: string): { start: string | null; end: string | null } {
  const raw = field(text, "제작 ?기간") ?? "";
  const dates = raw.match(/\d{2}\.\d{2}\.\d{2}/g) ?? [];
  return { start: dates[0] ? toIsoDate(dates[0]) : null, end: dates[1] ? toIsoDate(dates[1]) : null };
}

function parseBilling(text: string): number | null {
  const raw = field(text, "광고주 청구 금액\\(제작비\\)") ?? field(text, "제작비") ?? "";
  const man = raw.match(/([\d,]+)\s*만원/);
  if (man) return parseInt(man[1].replace(/,/g, ""), 10) * 10000;
  const won = raw.match(/([\d,]+)\s*원/);
  if (won) return parseInt(won[1].replace(/,/g, ""), 10);
  return null;
}

function parseContentType(text: string): ContentType[] {
  const set = new Set<ContentType>();
  if (/숏폼|촬영/.test(text)) set.add("촬영숏폼");
  if (/스틸|사진/.test(text)) set.add("스틸사진");
  if (/AI ?영상/.test(text)) set.add("AI영상");
  return [...set];
}

function extractLink(slide: Slide): string | null {
  for (const el of slide.pageElements ?? []) {
    const url = el.link?.url ?? el.image?.imageProperties?.link?.url;
    if (url) return url;
  }
  return null;
}

export function parseSlide(slide: Slide): ParsedFields {
  const text = slideText(slide);
  const { start, end } = parsePeriod(text);
  const piece = field(text, "총 제작 편 수")?.match(/(\d+)/);
  return {
    client: field(text, "광고주") ?? "",
    project_title: field(text, "프로젝트") ?? "",
    overview: field(text, "프로젝트 개요") ?? "",
    period_start: start,
    period_end: end,
    year_month: end ? end.slice(0, 7) : start ? start.slice(0, 7) : null,
    in_house: /외주 ?여부\s*[:：].*내부/.test(text) ? true : /외주/.test(text) ? false : null,
    piece_count: piece ? parseInt(piece[1], 10) : null,
    billing_amount: parseBilling(text),
    content_type: parseContentType(text),
    ai_used: /AI ?활용/.test(text),
    video_url: extractLink(slide),
    thumbnail: null, // Task 5에서 채움
  };
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `npx vitest run sync/test/parseSlide.test.ts`
Expected: PASS (모든 케이스).

- [ ] **Step 6: fixture로 스모크 확인**

`sync/test/parseSlide.test.ts`에 추가:
```typescript
import fixture from "./fixtures/sample-presentation.json";
it("실제 fixture에서 프로젝트 슬라이드를 파싱한다", () => {
  const slides = (fixture as any).slides ?? [];
  const projects = slides.filter(isProjectSlide);
  expect(projects.length).toBeGreaterThan(50);
  const first = parseSlide(projects[0]);
  expect(first.client).not.toBe("");
});
```
Run: `npx vitest run sync/test/parseSlide.test.ts`
Expected: PASS. (편수 임계값은 실제 결과에 맞게 조정 가능.)

- [ ] **Step 7: 커밋**

```bash
git add sync/src/parseSlide.ts sync/test/parseSlide.test.ts vitest.config.ts
git commit -m "feat(sync): 슬라이드 파싱 및 영상링크 추출 (TDD)"
```

---

## Task 4: 썸네일 다운로드 (I/O)

각 프로젝트 슬라이드를 PNG로 렌더해 저장한다. Slides API `getThumbnail`을 사용 (개별 이미지 조합보다 안정적).

**Files:**
- Modify: `sync/src/slidesClient.ts`

- [ ] **Step 1: getThumbnail 함수 추가**

```typescript
// sync/src/slidesClient.ts 에 추가
import * as path from "node:path";

export async function downloadThumbnail(
  presentationId: string,
  slideObjectId: string,
  outDir: string,
): Promise<string> {
  const auth = await getAuth();
  const slides = google.slides({ version: "v1", auth });
  const thumb = await slides.presentations.pages.getThumbnail({
    presentationId,
    pageObjectId: slideObjectId,
    "thumbnailProperties.mimeType": "PNG",
    "thumbnailProperties.thumbnailSize": "MEDIUM",
  });
  const url = thumb.data.contentUrl!;
  const res = await fetch(url);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(outDir, { recursive: true });
  const rel = `thumbnails/${slideObjectId}.png`;
  fs.writeFileSync(path.join(outDir, "..", rel), buf);
  return rel;
}
```

> `getAuth`를 export하지 않고 모듈 내부에서 재사용. 인증 1회 후 토큰 캐시되므로 호출마다 재인증 없음.

- [ ] **Step 2: 수동 스모크 (스크립트로 1장 받기)**

`sync/scripts/dump-presentation.ts` 끝에 임시 추가 후 `npm run dump` 실행:
```typescript
import { downloadThumbnail } from "../src/slidesClient.js";
const firstProject = slides.find((s) => (s.pageElements ?? []).some((e) =>
  e.shape?.text?.textElements?.some((t) => /광고주/.test(t.textRun?.content ?? ""))));
if (firstProject) {
  const rel = await downloadThumbnail(id, firstProject.objectId!, "data/thumbnails");
  console.log("썸네일 저장:", rel);
}
```
Expected: `data/thumbnails/<id>.png` 생성, 열어서 슬라이드 화면이 맞는지 확인. 확인 후 임시 코드 제거.

- [ ] **Step 3: 커밋**

```bash
git add sync/src/slidesClient.ts
git commit -m "feat(sync): 슬라이드 썸네일 다운로드"
```

---

## Task 5: classify — Claude 자동 분류 (프롬프트 순수 / 호출 I/O)

**Files:**
- Create: `sync/src/classify.ts`, `sync/test/classify.test.ts`

- [ ] **Step 1: 프롬프트 빌더 테스트 (순수 부분만 TDD)**

```typescript
// sync/test/classify.test.ts
import { describe, it, expect } from "vitest";
import { buildClassifyPrompt, parseClassifyResponse } from "../src/classify.js";

describe("buildClassifyPrompt", () => {
  it("필드와 통제어휘를 포함한다", () => {
    const p = buildClassifyPrompt({ client: "메디힐", project_title: "선케어", overview: "양현종 메이킹필름" } as any);
    expect(p).toContain("메디힐");
    expect(p).toContain("인터뷰형"); // 어휘 목록 포함
  });
});

describe("parseClassifyResponse", () => {
  it("JSON 블록을 파싱한다", () => {
    const r = parseClassifyResponse('```json\n{"industry":"뷰티","format_concept":["메이킹필름"],"mood":["감성"],"keywords":["선케어"],"search_summary":"요약"}\n```');
    expect(r.industry).toBe("뷰티");
    expect(r.format_concept).toEqual(["메이킹필름"]);
    expect(r._ai_confidence).toBe("estimated");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run sync/test/classify.test.ts`
Expected: FAIL — 미정의.

- [ ] **Step 3: classify.ts 구현**

```typescript
// sync/src/classify.ts
import Anthropic from "@anthropic-ai/sdk";
import type { ParsedFields, AiFields } from "./types.js";
import { INDUSTRIES, FORMATS, MOODS } from "./vocab.js";

export function buildClassifyPrompt(p: ParsedFields): string {
  return `다음 영상 포트폴리오를 분류해 JSON으로만 답하라.

광고주: ${p.client}
프로젝트: ${p.project_title}
개요: ${p.overview}

규칙:
- industry: 다음 중 하나 — ${INDUSTRIES.join(", ")} (없으면 가장 가까운 것, 정말 없으면 "기타")
- format_concept: 다음에서 1~3개 — ${FORMATS.join(", ")} (새 개념이 꼭 필요하면 추가 가능)
- mood: 다음에서 1~3개 — ${MOODS.join(", ")}
- keywords: 검색에 쓸 자유 키워드 3~6개 (출연 셀럽, 제품, 소재 등)
- search_summary: 한 문장 한국어 요약

\`\`\`json
{"industry":"","format_concept":[],"mood":[],"keywords":[],"search_summary":""}
\`\`\``;
}

export function parseClassifyResponse(text: string): AiFields {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("분류 응답에서 JSON을 찾지 못함: " + text.slice(0, 200));
  const o = JSON.parse(m[0]);
  return {
    industry: o.industry ?? "기타",
    format_concept: o.format_concept ?? [],
    mood: o.mood ?? [],
    keywords: o.keywords ?? [],
    search_summary: o.search_summary ?? "",
    _ai_confidence: "estimated",
  };
}

export async function classify(p: ParsedFields): Promise<AiFields> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const res = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 500,
    messages: [{ role: "user", content: buildClassifyPrompt(p) }],
  });
  const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  return parseClassifyResponse(text);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run sync/test/classify.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add sync/src/classify.ts sync/test/classify.test.ts
git commit -m "feat(sync): Claude 자동 분류 (프롬프트 TDD)"
```

---

## Task 6: buildCatalog — 오케스트레이션 (diff + public/internal 분리 + write)

**Files:**
- Create: `sync/src/buildCatalog.ts`

- [ ] **Step 1: buildCatalog.ts 구현**

```typescript
// sync/src/buildCatalog.ts
import "dotenv/config";
import * as fs from "node:fs";
import { fetchPresentation, downloadThumbnail } from "./slidesClient.js";
import { parseSlide, isProjectSlide } from "./parseSlide.js";
import { classify } from "./classify.js";
import type { PortfolioItem, PublicPortfolioItem } from "./types.js";

const PRES_ID = process.env.PRESENTATION_ID!;
const INTERNAL = "data/catalog.internal.json";
const PUBLIC = "data/catalog.public.json";

function slug(client: string, title: string, slideId: string): string {
  return `${client}-${title}`.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").slice(0, 40) + "-" + slideId.slice(-4);
}

async function main() {
  const pres = await fetchPresentation(PRES_ID);
  const projectSlides = (pres.slides ?? []).filter(isProjectSlide);
  console.log(`프로젝트 슬라이드 ${projectSlides.length}개`);

  // 기존 catalog 로드 → 변경분만 AI 재분류 (멱등)
  const prev: PortfolioItem[] = fs.existsSync(INTERNAL)
    ? JSON.parse(fs.readFileSync(INTERNAL, "utf8"))
    : [];
  const prevById = new Map(prev.map((p) => [p.source_slide_id, p]));

  const items: PortfolioItem[] = [];
  for (const slide of projectSlides) {
    const slideId = slide.objectId!;
    const parsed = parseSlide(slide as any);
    parsed.thumbnail = await downloadThumbnail(PRES_ID, slideId, "data/thumbnails");

    const existing = prevById.get(slideId);
    // 개요·제목이 같으면 기존 AI 분류 재사용 (비용 절약)
    const unchanged = existing &&
      existing.overview === parsed.overview &&
      existing.project_title === parsed.project_title;
    const ai = unchanged
      ? { industry: existing!.industry, format_concept: existing!.format_concept, mood: existing!.mood, keywords: existing!.keywords, search_summary: existing!.search_summary, _ai_confidence: "estimated" as const }
      : await classify(parsed);
    if (!unchanged) console.log("AI 분류:", parsed.client, parsed.project_title);

    items.push({ id: slug(parsed.client, parsed.project_title, slideId), source_slide_id: slideId, ...parsed, ...ai });
  }

  fs.writeFileSync(INTERNAL, JSON.stringify(items, null, 2));
  const publicItems: PublicPortfolioItem[] = items.map(({ billing_amount, ...rest }) => rest);
  fs.writeFileSync(PUBLIC, JSON.stringify(publicItems, null, 2));
  console.log(`완료: 내부 ${items.length}건, 공개 ${publicItems.length}건`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: 커밋**

```bash
git add sync/src/buildCatalog.ts
git commit -m "feat(sync): catalog 빌드 오케스트레이션 (diff·public분리)"
```

---

## Task 7: 전체 동기화 실행 + 결과 검수

**Files:**
- Create: `data/catalog.public.json`, `data/catalog.internal.json`, `data/thumbnails/*`

- [ ] **Step 1: 전체 동기화 실행**

Run: `npm run sync`
Expected: 프로젝트 슬라이드 N개 처리, AI 분류 로그, `data/catalog.public.json` 생성.

- [ ] **Step 2: 결과 사람 검수 (CLAUDE.md 원칙)**

확인:
- `catalog.public.json`에 `billing_amount`가 **없어야** 함.
- 표본 5건의 `industry/format_concept/mood`가 그럴듯한지 육안 검수.
- 신규/이상 태그(통제 어휘 밖)가 있으면 기록 → `vocab.ts`에 편입할지 판단.
- `video_url`이 실제 영상으로 연결되는지 표본 클릭.

산출 요약을 사용자에게 보고 (건수, 업종 분포, AI활용 비율).

- [ ] **Step 3: 공개 catalog만 커밋 (내부본은 .gitignore)**

```bash
git add data/catalog.public.json data/thumbnails
git commit -m "data: 초기 catalog 동기화 결과"
```

---

## Task 8: 웹 스캐폴드 (Vite + React + TS)

**Files:**
- Create: `web/` (Vite 스캐폴드)

- [ ] **Step 1: Vite 앱 생성**

Run: `npm create vite@latest web -- --template react-ts` 후 `cd web && npm install`
Expected: `web/` 생성, `npm run dev`로 기본 페이지 확인.

- [ ] **Step 2: catalog/썸네일을 public으로 복사하는 스크립트**

루트 `package.json` scripts에 추가:
```json
"web:data": "cp data/catalog.public.json web/public/catalog.public.json && cp -r data/thumbnails web/public/thumbnails"
```
Run: `npm run web:data`
Expected: `web/public/catalog.public.json` 존재.

- [ ] **Step 3: 타입 공유** — `web/src/types.ts`에 `PublicPortfolioItem` 정의를 복사(또는 재노출). sync/src/types.ts와 동일 필드.

```typescript
// web/src/types.ts  (sync/src/types.ts의 Public 타입과 동일)
export type ContentType = "촬영숏폼" | "스틸사진" | "AI영상";
export interface PublicPortfolioItem {
  id: string; source_slide_id: string;
  client: string; project_title: string; overview: string;
  period_start: string | null; period_end: string | null; year_month: string | null;
  in_house: boolean | null; piece_count: number | null;
  content_type: ContentType[]; ai_used: boolean;
  video_url: string | null; thumbnail: string | null;
  industry: string; format_concept: string[]; mood: string[]; keywords: string[];
  search_summary: string; _ai_confidence: "estimated";
}
```

- [ ] **Step 4: 커밋**

```bash
git add web package.json
git commit -m "feat(web): Vite React 스캐폴드 + 데이터 복사 스크립트"
```

---

## Task 9: filter 라이브러리 (TDD, 순수 함수)

**Files:**
- Create: `web/src/lib/filter.ts`, `web/test/filter.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// web/test/filter.test.ts
import { describe, it, expect } from "vitest";
import { applyFilters, keywordMatch, type Filters } from "../src/lib/filter";
import type { PublicPortfolioItem } from "../src/types";

const item = (over: Partial<PublicPortfolioItem>): PublicPortfolioItem => ({
  id: "1", source_slide_id: "g1", client: "메디힐", project_title: "선케어", overview: "양현종 메이킹",
  period_start: "2026-03-12", period_end: "2026-04-06", year_month: "2026-04",
  in_house: true, piece_count: 1, content_type: ["촬영숏폼"], ai_used: false,
  video_url: "u", thumbnail: "t", industry: "뷰티", format_concept: ["메이킹필름"],
  mood: ["감성"], keywords: ["선케어", "양현종"], search_summary: "선케어 메이킹", _ai_confidence: "estimated",
  ...over,
});

const empty: Filters = { industry: [], format_concept: [], mood: [], content_type: [], ai_used: null, year_month: [], client: [] };

describe("applyFilters", () => {
  it("빈 필터는 전부 통과", () => {
    const items = [item({}), item({ id: "2", industry: "식품" })];
    expect(applyFilters(items, empty)).toHaveLength(2);
  });
  it("업종 필터", () => {
    const items = [item({}), item({ id: "2", industry: "식품" })];
    expect(applyFilters(items, { ...empty, industry: ["뷰티"] })).toHaveLength(1);
  });
  it("AI활용 필터", () => {
    const items = [item({ ai_used: true }), item({ id: "2", ai_used: false })];
    expect(applyFilters(items, { ...empty, ai_used: true })).toHaveLength(1);
  });
});

describe("keywordMatch", () => {
  it("키워드/개요/광고주에서 부분일치", () => {
    expect(keywordMatch(item({}), "양현종")).toBe(true);
    expect(keywordMatch(item({}), "세무")).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd web && npx vitest run test/filter.test.ts`
Expected: FAIL — 미정의.

- [ ] **Step 3: filter.ts 구현**

```typescript
// web/src/lib/filter.ts
import type { PublicPortfolioItem } from "../types";

export interface Filters {
  industry: string[];
  format_concept: string[];
  mood: string[];
  content_type: string[];
  ai_used: boolean | null;
  year_month: string[];
  client: string[];
}

const some = (sel: string[], vals: string[]) => sel.length === 0 || sel.some((s) => vals.includes(s));

export function applyFilters(items: PublicPortfolioItem[], f: Filters): PublicPortfolioItem[] {
  return items.filter((it) =>
    some(f.industry, [it.industry]) &&
    some(f.format_concept, it.format_concept) &&
    some(f.mood, it.mood) &&
    some(f.content_type, it.content_type) &&
    (f.ai_used === null || it.ai_used === f.ai_used) &&
    some(f.year_month, it.year_month ? [it.year_month] : []) &&
    some(f.client, [it.client]),
  );
}

export function keywordMatch(it: PublicPortfolioItem, q: string): boolean {
  if (!q.trim()) return true;
  const hay = [it.client, it.project_title, it.overview, it.search_summary, ...it.keywords, ...it.format_concept, ...it.mood].join(" ").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd web && npx vitest run test/filter.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add web/src/lib/filter.ts web/test/filter.test.ts web/src/types.ts
git commit -m "feat(web): 필터·키워드매칭 순수 로직 (TDD)"
```

---

## Task 10: Card + Gallery 컴포넌트

**Files:**
- Create: `web/src/components/Card.tsx`, `web/src/components/Gallery.tsx`, `web/src/components/AccuracyBadge.tsx`

- [ ] **Step 1: AccuracyBadge.tsx**

```tsx
// web/src/components/AccuracyBadge.tsx
export function AccuracyBadge() {
  return <span title="AI 추정 분류" style={{ fontSize: 10, opacity: 0.55, border: "1px solid #ccc", borderRadius: 4, padding: "0 4px", marginLeft: 4 }}>AI추정</span>;
}
```

- [ ] **Step 2: Card.tsx**

```tsx
// web/src/components/Card.tsx
import type { PublicPortfolioItem } from "../types";
import { AccuracyBadge } from "./AccuracyBadge";

export function Card({ item, onOpen }: { item: PublicPortfolioItem; onOpen: (i: PublicPortfolioItem) => void }) {
  return (
    <button onClick={() => onOpen(item)} style={{ textAlign: "left", border: "1px solid #eee", borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "#fff", padding: 0 }}>
      <img src={item.thumbnail ?? ""} alt={item.project_title} loading="lazy" style={{ width: "100%", aspectRatio: "16/10", objectFit: "cover", background: "#f3f3f3" }} />
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
          {item.content_type.map((c) => <span key={c} style={{ fontSize: 11, background: "#eef", borderRadius: 4, padding: "1px 6px" }}>{c}</span>)}
          {item.ai_used && <span style={{ fontSize: 11, background: "#efe", borderRadius: 4, padding: "1px 6px" }}>AI활용</span>}
        </div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.client}</div>
        <div style={{ fontSize: 12, color: "#555", lineHeight: 1.4 }}>{item.project_title}</div>
        <div style={{ fontSize: 11, color: "#999", marginTop: 6 }}>{item.year_month} · {item.industry}<AccuracyBadge /></div>
      </div>
    </button>
  );
}
```

- [ ] **Step 3: Gallery.tsx**

```tsx
// web/src/components/Gallery.tsx
import type { PublicPortfolioItem } from "../types";
import { Card } from "./Card";

export function Gallery({ items, onOpen }: { items: PublicPortfolioItem[]; onOpen: (i: PublicPortfolioItem) => void }) {
  if (items.length === 0) return <p style={{ color: "#888" }}>결과가 없습니다.</p>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
      {items.map((it) => <Card key={it.id} item={it} onOpen={onOpen} />)}
    </div>
  );
}
```

- [ ] **Step 4: 커밋**

```bash
git add web/src/components/Card.tsx web/src/components/Gallery.tsx web/src/components/AccuracyBadge.tsx
git commit -m "feat(web): Card·Gallery·AccuracyBadge 컴포넌트"
```

---

## Task 11: FilterSidebar 컴포넌트

**Files:**
- Create: `web/src/components/FilterSidebar.tsx`

- [ ] **Step 1: FilterSidebar.tsx**

```tsx
// web/src/components/FilterSidebar.tsx
import type { Filters } from "../lib/filter";
import type { PublicPortfolioItem } from "../types";

function uniq(arr: string[]) { return [...new Set(arr)].sort(); }

function Group({ title, options, selected, onToggle }: { title: string; options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((o) => (
          <label key={o} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 12, cursor: "pointer", border: "1px solid", borderColor: selected.includes(o) ? "#446" : "#ddd", background: selected.includes(o) ? "#eef" : "#fff" }}>
            <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggle(o)} style={{ display: "none" }} />{o}
          </label>
        ))}
      </div>
    </div>
  );
}

export function FilterSidebar({ items, filters, setFilters }: { items: PublicPortfolioItem[]; filters: Filters; setFilters: (f: Filters) => void }) {
  const toggle = (key: keyof Filters, v: string) => {
    const cur = filters[key] as string[];
    setFilters({ ...filters, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  return (
    <aside style={{ width: 220, flexShrink: 0 }}>
      <Group title="업종" options={uniq(items.map((i) => i.industry))} selected={filters.industry} onToggle={(v) => toggle("industry", v)} />
      <Group title="포맷·컨셉" options={uniq(items.flatMap((i) => i.format_concept))} selected={filters.format_concept} onToggle={(v) => toggle("format_concept", v)} />
      <Group title="무드" options={uniq(items.flatMap((i) => i.mood))} selected={filters.mood} onToggle={(v) => toggle("mood", v)} />
      <Group title="콘텐츠 종류" options={uniq(items.flatMap((i) => i.content_type))} selected={filters.content_type} onToggle={(v) => toggle("content_type", v)} />
      <Group title="광고주" options={uniq(items.map((i) => i.client))} selected={filters.client} onToggle={(v) => toggle("client", v)} />
      <Group title="제작월" options={uniq(items.map((i) => i.year_month ?? "")).filter(Boolean)} selected={filters.year_month} onToggle={(v) => toggle("year_month", v)} />
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>AI 활용</div>
        <button onClick={() => setFilters({ ...filters, ai_used: filters.ai_used === true ? null : true })} style={{ fontSize: 12, padding: "2px 8px", borderRadius: 12, border: "1px solid", borderColor: filters.ai_used ? "#446" : "#ddd" }}>AI활용만</button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add web/src/components/FilterSidebar.tsx
git commit -m "feat(web): 필터 사이드바"
```

---

## Task 12: SearchBar (자연어 + 즉시 키워드 폴백)

**Files:**
- Create: `web/src/components/SearchBar.tsx`

- [ ] **Step 1: SearchBar.tsx**

문장 검색은 `/api/search` 호출. 비어있거나 실패 시 즉시 키워드 매칭(filter.ts)으로 폴백.

```tsx
// web/src/components/SearchBar.tsx
import { useState } from "react";

export function SearchBar({ onSearch, onClear, loading }: { onSearch: (q: string) => void; onClear: () => void; loading: boolean }) {
  const [q, setQ] = useState("");
  return (
    <form onSubmit={(e) => { e.preventDefault(); q.trim() ? onSearch(q.trim()) : onClear(); }} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder='예: "양현종 나온 선케어 메이킹 영상", "유머러스한 세무 숏폼"'
        style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", fontSize: 14 }} />
      <button type="submit" disabled={loading} style={{ padding: "0 18px", borderRadius: 10, border: "none", background: "#334", color: "#fff", cursor: "pointer" }}>
        {loading ? "검색중…" : "검색"}
      </button>
      {<button type="button" onClick={() => { setQ(""); onClear(); }} style={{ padding: "0 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>초기화</button>}
    </form>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add web/src/components/SearchBar.tsx
git commit -m "feat(web): 검색바"
```

---

## Task 13: StatsPanel 컴포넌트

**Files:**
- Create: `web/src/components/StatsPanel.tsx`

- [ ] **Step 1: StatsPanel.tsx** (금액 집계 없음 — 공개 데이터 기준)

```tsx
// web/src/components/StatsPanel.tsx
import type { PublicPortfolioItem } from "../types";

function countBy(items: PublicPortfolioItem[], key: (i: PublicPortfolioItem) => string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const it of items) for (const k of key(it)) m.set(k, (m.get(k) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Bar({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return <div>{rows.map(([k, n]) => (
    <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 12 }}>
      <div style={{ width: 110, textAlign: "right", color: "#555" }}>{k}</div>
      <div style={{ height: 14, width: `${(n / max) * 200}px`, background: "#88a", borderRadius: 3 }} />
      <div>{n}</div>
    </div>
  ))}</div>;
}

export function StatsPanel({ items }: { items: PublicPortfolioItem[] }) {
  const total = items.length;
  const totalPieces = items.reduce((s, i) => s + (i.piece_count ?? 0), 0);
  const aiPct = total ? Math.round((items.filter((i) => i.ai_used).length / total) * 100) : 0;
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", gap: 24 }}>
        <Stat label="프로젝트" value={total} />
        <Stat label="총 제작 편수" value={totalPieces} />
        <Stat label="AI 활용 비율" value={`${aiPct}%`} />
      </div>
      <div><h4>광고주별</h4><Bar rows={countBy(items, (i) => [i.client])} /></div>
      <div><h4>콘텐츠 유형별</h4><Bar rows={countBy(items, (i) => i.content_type)} /></div>
      <div><h4>업종별</h4><Bar rows={countBy(items, (i) => [i.industry])} /></div>
      <div><h4>월별</h4><Bar rows={countBy(items, (i) => i.year_month ? [i.year_month] : []).sort()} /></div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number | string }) {
  return <div style={{ background: "#f7f7fb", borderRadius: 10, padding: "14px 20px" }}><div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div><div style={{ fontSize: 12, color: "#777" }}>{label}</div></div>;
}
```

- [ ] **Step 2: 커밋**

```bash
git add web/src/components/StatsPanel.tsx
git commit -m "feat(web): 통계 패널"
```

---

## Task 14: DetailModal 컴포넌트

**Files:**
- Create: `web/src/components/DetailModal.tsx`

- [ ] **Step 1: DetailModal.tsx**

```tsx
// web/src/components/DetailModal.tsx
import type { PublicPortfolioItem } from "../types";
import { AccuracyBadge } from "./AccuracyBadge";

export function DetailModal({ item, onClose }: { item: PublicPortfolioItem | null; onClose: () => void }) {
  if (!item) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 10 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, maxWidth: 560, width: "100%", overflow: "hidden" }}>
        <img src={item.thumbnail ?? ""} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover" }} />
        <div style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{item.client}</div>
          <div style={{ color: "#555", marginBottom: 10 }}>{item.project_title}</div>
          <p style={{ fontSize: 14, lineHeight: 1.6 }}>{item.overview}</p>
          <div style={{ fontSize: 12, color: "#666", marginTop: 10 }}>
            제작월 {item.year_month} · {item.in_house ? "내부제작" : "외주"} · {item.piece_count ?? "-"}편<br />
            업종 {item.industry} · 포맷 {item.format_concept.join(", ")} · 무드 {item.mood.join(", ")}<AccuracyBadge />
          </div>
          {item.video_url && <a href={item.video_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 14, padding: "10px 18px", background: "#334", color: "#fff", borderRadius: 8, textDecoration: "none" }}>영상 보기 ↗</a>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 커밋**

```bash
git add web/src/components/DetailModal.tsx
git commit -m "feat(web): 상세 모달"
```

---

## Task 15: /api/search 서버리스 함수 (Claude 랭킹)

**Files:**
- Create: `api/search.ts`, `vercel.json`

- [ ] **Step 1: vercel.json**

```json
{ "functions": { "api/search.ts": { "maxDuration": 30 } } }
```

- [ ] **Step 2: api/search.ts 구현**

질의 + 공개 catalog 요약을 Claude에 넘겨 매칭 id 배열을 받는다. catalog는 `web/public`에서 함수가 읽거나, 요청 body로 받는다(작아서 body 전달이 단순). 여기선 body로 받는다.

```typescript
// api/search.ts  (Vercel Node 함수)
import Anthropic from "@anthropic-ai/sdk";

interface SummaryItem { id: string; client: string; project_title: string; search_summary: string; keywords: string[]; format_concept: string[]; mood: string[]; industry: string }

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).end();
  const { query, items } = req.body as { query: string; items: SummaryItem[] };
  if (!query || !Array.isArray(items)) return res.status(400).json({ error: "query/items 필요" });

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const catalog = items.map((i) => `${i.id} | ${i.client} | ${i.project_title} | ${i.industry} | ${i.format_concept.join(",")} | ${i.mood.join(",")} | ${i.keywords.join(",")} | ${i.search_summary}`).join("\n");
  const msg = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 400,
    system: "너는 영상 포트폴리오 검색 엔진이다. 사용자 질의에 가장 잘 맞는 항목 id를 관련도 높은 순으로 JSON 배열로만 답한다. 관련 없으면 제외한다. 형식: {\"ids\":[\"id1\",\"id2\"]}",
    messages: [{ role: "user", content: `질의: ${query}\n\n후보(id | 광고주 | 프로젝트 | 업종 | 포맷 | 무드 | 키워드 | 요약):\n${catalog}` }],
  });
  const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const m = text.match(/\{[\s\S]*\}/);
  const ids: string[] = m ? (JSON.parse(m[0]).ids ?? []) : [];
  res.json({ ids });
}
```

> 보안: `ANTHROPIC_API_KEY`는 Vercel 환경변수로만 설정. 브라우저로 절대 노출 금지.

- [ ] **Step 3: 커밋**

```bash
git add api/search.ts vercel.json
git commit -m "feat(api): 자연어 검색 서버리스 함수 (Claude 랭킹)"
```

---

## Task 16: App 통합 (데이터 로드 + 탭 + 검색 연결)

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: App.tsx 작성**

```tsx
// web/src/App.tsx
import { useEffect, useMemo, useState } from "react";
import type { PublicPortfolioItem } from "./types";
import { applyFilters, keywordMatch, type Filters } from "./lib/filter";
import { Gallery } from "./components/Gallery";
import { FilterSidebar } from "./components/FilterSidebar";
import { SearchBar } from "./components/SearchBar";
import { StatsPanel } from "./components/StatsPanel";
import { DetailModal } from "./components/DetailModal";

const emptyFilters: Filters = { industry: [], format_concept: [], mood: [], content_type: [], ai_used: null, year_month: [], client: [] };

export default function App() {
  const [all, setAll] = useState<PublicPortfolioItem[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [tab, setTab] = useState<"gallery" | "stats">("gallery");
  const [open, setOpen] = useState<PublicPortfolioItem | null>(null);
  const [searchIds, setSearchIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [kw, setKw] = useState("");

  useEffect(() => { fetch("/catalog.public.json").then((r) => r.json()).then(setAll); }, []);

  const filtered = useMemo(() => {
    let r = applyFilters(all, filters);
    if (searchIds) { const order = new Map(searchIds.map((id, i) => [id, i])); r = r.filter((i) => order.has(i.id)).sort((a, b) => order.get(a.id)! - order.get(b.id)!); }
    else if (kw) r = r.filter((i) => keywordMatch(i, kw));
    return r;
  }, [all, filters, searchIds, kw]);

  async function onSearch(q: string) {
    setLoading(true); setKw(q); setSearchIds(null);
    try {
      const items = all.map(({ id, client, project_title, search_summary, keywords, format_concept, mood, industry }) => ({ id, client, project_title, search_summary, keywords, format_concept, mood, industry }));
      const res = await fetch("/api/search", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q, items }) });
      if (res.ok) setSearchIds((await res.json()).ids);
    } catch { /* 키워드 폴백 유지 */ }
    setLoading(false);
  }
  function onClear() { setKw(""); setSearchIds(null); }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22 }}>매드업 촬영·AI 영상 포트폴리오</h1>
      <div style={{ display: "flex", gap: 8, margin: "12px 0" }}>
        <button onClick={() => setTab("gallery")} style={tabStyle(tab === "gallery")}>갤러리</button>
        <button onClick={() => setTab("stats")} style={tabStyle(tab === "stats")}>통계</button>
      </div>
      {tab === "gallery" ? (
        <>
          <SearchBar onSearch={onSearch} onClear={onClear} loading={loading} />
          <div style={{ display: "flex", gap: 24 }}>
            <FilterSidebar items={all} filters={filters} setFilters={setFilters} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>{filtered.length}건{searchIds ? " · 자연어 검색 결과" : ""}</div>
              <Gallery items={filtered} onOpen={setOpen} />
            </div>
          </div>
        </>
      ) : <StatsPanel items={all} />}
      <DetailModal item={open} onClose={() => setOpen(null)} />
    </div>
  );
}
function tabStyle(active: boolean): React.CSSProperties { return { padding: "6px 16px", borderRadius: 8, border: "1px solid #ddd", background: active ? "#334" : "#fff", color: active ? "#fff" : "#333", cursor: "pointer" }; }
```

- [ ] **Step 2: 로컬 동작 확인 (Vite dev — 검색은 폴백으로)**

Run: `cd web && npm run dev`
Expected: 브라우저에서 갤러리 렌더, 썸네일 표시, 필터 클릭 시 결과 변화, 통계 탭 동작, 카드 클릭 시 모달+영상링크. (dev에선 `/api/search`가 없으니 키워드 폴백으로 동작.)

- [ ] **Step 3: 커밋**

```bash
git add web/src/App.tsx
git commit -m "feat(web): App 통합 — 갤러리·필터·검색·통계·모달"
```

---

## Task 17: Vercel 배포

**Files:**
- Modify: `vercel.json`, 루트 `package.json` (build 스크립트)

- [ ] **Step 1: 빌드 스크립트 정리**

루트 `package.json` scripts:
```json
"build": "npm run web:data && cd web && npm run build"
```
`vercel.json`:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "web/dist",
  "functions": { "api/search.ts": { "maxDuration": 30 } }
}
```

- [ ] **Step 2: Vercel 프로젝트 연결 + 환경변수**

Run: `npx vercel link` 후 `npx vercel env add ANTHROPIC_API_KEY production`
Expected: 키 등록 완료. (브라우저 노출 안 됨 — 함수에서만 사용.)

- [ ] **Step 3: 배포**

Run: `npx vercel --prod`
Expected: 배포 URL 출력. 접속해서 갤러리·필터·통계 동작 확인, **자연어 검색이 실제로 작동**(예: "유머러스한 세무 숏폼" → 비즈넵 관련 항목 랭킹)하는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add vercel.json package.json
git commit -m "chore: Vercel 배포 설정"
```

---

## Task 18: 최종 검증 (사람 검수 + 골든패스)

- [ ] **Step 1: 골든패스 시나리오 점검**

배포 URL에서 확인:
1. 갤러리 로드 + 썸네일 정상.
2. 필터(업종·포맷·무드·AI활용) 조합 → 건수 변화 정확.
3. 자연어 검색 3종 입력 → 관련 결과 + 랭킹이 납득되는지.
4. 카드 → 모달 → "영상 보기" → 실제 영상 이동.
5. 통계 탭 수치(편수·AI비율·분포)가 catalog와 일치.
6. 공개 페이지 어디에도 **금액이 노출되지 않음**.

- [ ] **Step 2: 정확도 보고**

사용자에게 보고: 총 건수, AI 분류 표본 정확도(육안 N/N), 검색 품질 소감, 배포 URL. AI 분류 오분류 항목이 있으면 목록화 → `vocab.ts` 보완 또는 재분류로 후속.

- [ ] **Step 3: 마무리 커밋 (필요 시)**

```bash
git add -A
git commit -m "test: Phase 1 최종 검증 반영"
```

---

## Self-Review 결과 (계획 작성자 점검)

**Spec 커버리지:**
- 동기화(슬라이드→catalog, AI분류, 멱등 diff) → Task 1·3·5·6·7 ✅
- 데이터 모델(파싱 정확 / AI 추정, public·internal 분리) → Task 2·6, 금액 제외 Task 6 Step1 ✅
- 웹(갤러리·필터·자연어검색·통계) → Task 8~16 ✅
- 자연어 검색 = 서버리스 LLM 랭킹 + 키워드 폴백 → Task 12·15·16 ✅
- 민감정보(금액 공개 제외) → Task 6·18 ✅
- 정확도 표시(AI추정 배지) → Task 10·14 ✅
- 검증 미지수(추출 가능성·링크 경로·구조 규칙성) → Task 1 판단 게이트 ✅
- 슬랙(Phase 2·3) → 본 계획 범위 밖 (별도 계획) ✅

**Placeholder 스캔:** 코드 단계는 실제 코드 포함. "수동 확인"은 외부 API/배포 특성상 불가피한 검수 단계로, 기대 출력 명시함.

**타입 일관성:** `PortfolioItem`/`PublicPortfolioItem`/`Filters` 필드명이 sync·web·api 전반에서 동일. `parseSlide`→`buildCatalog`→catalog→`filter`/`search` 흐름의 필드명 일치 확인.

**알려진 의존 리스크:** Task 1 Step 7의 링크 추출 경로 확인 결과에 따라 `parseSlide.extractLink`/`Task1 dump` 의 경로를 조정해야 함(계획에 명시됨). 이 게이트가 실패하면 동기화 설계 재검토 필요.
