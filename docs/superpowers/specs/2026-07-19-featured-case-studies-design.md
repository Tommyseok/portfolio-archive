# Featured Case Studies + 통합 상세 뷰 — 설계

- **작성일**: 2026-07-19
- **대상**: Showcase(공개) 페이지에 Featured Case Studies 섹션 신설 + 상세 뷰(CaseView·ItemModal)를 하나의 스택형 다크 레이아웃으로 통합
- **브랜치**: phase1-archive 기반

## 1. 목표 · 배경

광고주가 에이전시를 고르는 행위의 본질은 **위험 축소**다. 담당자의 질문은 "이 회사에 브리프를 던지면 무슨 일이 벌어지는가"이며, 계약을 부르는 케이스 스터디는 자랑이 아니라 **광고주가 자기 문제를 대입해보는 시뮬레이션**이다. 이 원칙에서:

- 각 Featured는 '작품'이 아니라 **문제 하나**를 대표한다. 헤드라인은 문제-해결 문장.
- 첫 선정은 **광고주 고통 유형 배분** 우선: 심의·규제형 / 비용·모델료형 / 물량·속도형 (+ 브랜드·감성, 데이터·설계).
- 성과 숫자는 필수지만, 광고주 동의가 없으면 **버티컬 익명화**("헬스케어 D사")로 살린다 — 큐레이션 텍스트를 담당자가 직접 작성.
- 명칭은 **Featured Case Studies**로 확정 (증거성을 알리는 라벨).

## 2. 정보 구조 (Showcase 페이지 순서)

```
Hero 캐러셀 → 쇼릴 → MiddleStatement(Full-Stack Creative Service)
  → ▶ Featured Case Studies 섹션 (신규)
  → FilterBar + Selected work 그리드 (기존)
```

Featured는 **중간카피 아래 · 필터 위**에 위치한다. 필터는 아래 Selected work 그리드에만 적용되며 Featured에는 걸리지 않는다(큐레이션 고정 세트).

## 3. Featured 섹션 레이아웃 (확정)

- 아이브로우 `Featured Case Studies` + 가로 룰 라인.
- **대표작 1 (히어로)**: 풀 이미지 + 좌하단 텍스트 오버레이(좌측 그라디언트 스크림). 키커 · 문제-해결 헤드라인(볼드 + Instrument Serif 이탤릭 강조어) · 리드 1문단. **KPI·메타 라인 없음.** 클릭 시 상세 뷰로 확장.
- **하단 4타일**: `1fr 1fr 1fr` 3열 그리드, 좌열은 세로 2스택(타일1 위 / 타일4 아래), 중앙·우측은 세로 2행 span. **갭 0, 직각.** 각 타일 = 커버 이미지 + top-scrim + 좌상단 텍스트(볼드 제목 + 세리프 이탤릭 강조어, 보조 1줄). 배지·라운드박스 없음.
- **총 5개 고정** (히어로 1 + 타일 4). 자동 순환 없음. 관리자가 순서(`featured_rank` 1~5)를 지정.
- 호버: 이미지 scale 확대(타일 1.05 / 히어로 1.04).
- 개수 부족 대응: featured가 1개면 히어로만, 2~4개면 타일 수만큼만 렌더. 0개면 섹션 자체 숨김.

### 콘텐츠 소스 (필드 매핑)
- 커버 이미지: `featured_cover` → 없으면 `thumbnail` → 없으면 `asset_images[0]`
- 헤드라인: `featured_headline` (필수·큐레이션 전용) → 없으면 `custom_title`/`client`
- 보조/리드: `featured_subcopy` (히어로는 전문, 타일은 1줄 클램프)
- 키커(히어로): `featured_kicker` → 없으면 `Featured Case Study · {client}`

## 4. 통합 상세 뷰 (CaseView + ItemModal → DetailView)

기존 두 상세 UI(공개 `CaseView`, 스태프 `ItemModal`)를 **하나의 `DetailView` 컴포넌트**로 통합한다. 다크 테마, 위→아래 단일 스택:

```
[MADUP — SELECTED WORK 배지]                              [✕ 닫기]
타이틀 (큰 볼드)              ← custom_title || client
서브타이틀 (UPPER·트래킹)     ← "{media_type}, {format}"
세부 텍스트 설명              ← custom_description || overview || search_summary
메타 칩 (year_month · 팀 · 제작방식 · 업종 · N편 · 태그)
─────────────────────────────
이미지 배열 (직각 반응형 그리드) ← asset_images + extra_images (fallback thumbnail)
─────────────────────────────
상세 · 링크 (맨 아래)          ← custom_links[] || video_urls("영상 보기 N ↗") + 원본 슬라이드
```

### 모드
- **공개(비로그인)**: 읽기 전용. 편집·소셜 없음.
- **로그인(@madup.com)**: 하단에 소셜(좋아요·코멘트) + `✎ 편집` 진입.
- **편집 모드(스태프)**: 인라인 편집
  - 표시: `custom_title`, 서브(media_type/format), `custom_description`, 메타(소재타입·제작방식·제작팀·태그·크리에이터), 이미지 추가/삭제(`extra_images`, `uploadExtraImage`), 링크(`custom_links`)
  - **Featured 컨트롤**: `is_featured` 토글 + `featured_rank`(1~5 셀렉트, 중복 시 스왑 경고) + `featured_headline` + `featured_subcopy` + `featured_kicker` + `featured_cover`(기존 이미지 중 택1 또는 업로드)
  - Showcase 외부 공개 토글(`showcase_approved`) — 기존 유지
  - Featured인데 미승인이면 편집 패널에 "공개 승인해야 외부 노출됨" 경고

`ItemModal`의 하위 요소(`Carousel`, `Comments`, `TagEditor`)는 DetailView로 이동·재사용. `CaseView.tsx`·`ItemModal.tsx`는 제거.

## 5. 데이터 모델 (Supabase `credential_items` 신규 컬럼)

| 컬럼 | 타입 | 기본 | 용도 |
|---|---|---|---|
| `is_featured` | boolean | false | Featured 지정 |
| `featured_rank` | smallint | null | 1~5 (1=히어로). 비지정 null |
| `featured_headline` | text | null | 문제-해결 헤드라인 (타일·히어로) |
| `featured_subcopy` | text | null | 보조 카피 / 히어로 리드 |
| `featured_kicker` | text | null | 히어로 키커(익명화 포함 가능) |
| `featured_cover` | text | null | 커버 이미지 URL 오버라이드 |
| `custom_title` | text | null | 상세 뷰 타이틀 오버라이드 |
| `custom_links` | jsonb | `[]` | `[{label,url}]` 상세 링크 오버라이드 |

- 마이그레이션은 `apply_migration`(Supabase MCP)으로 추가. 전부 nullable/기본값 → 기존 579행 무영향.
- `web/src/types.ts` `Item`에 동일 필드 추가.

### RLS · 편집 권한
- 신규 컬럼을 @madup.com update 정책의 허용 컬럼에 포함(`saveOverlay` patch 타입에도 추가).
- Featured 공개 노출은 `showcase_approved`에 종속: 비로그인 RLS가 미승인 행을 애초에 반환 안 하므로, featured지만 미승인이면 공개에서 자연히 숨겨짐.
- `insert`/`delete`는 기존대로 service_role만.

## 6. 컴포넌트 · 파일 변경

- **신규** `web/src/components/FeaturedSection.tsx` — approved pool에서 featured 계산(`is_featured && featured_rank` 정렬·slice(5)), 히어로+타일 렌더, `onOpen(item)`.
- **신규** `web/src/components/DetailView.tsx` — 통합 상세(읽기/소셜/편집). `Carousel`·`Comments`·`TagEditor` 흡수.
- **수정** `web/src/pages/Showcase.tsx` — MiddleStatement와 FilterBar 사이에 `<FeaturedSection>`; `CaseView` → `DetailView`.
- **수정** `web/src/pages/Explore.tsx` — `ItemModal` → `DetailView`.
- **삭제** `CaseView.tsx`, `ItemModal.tsx`.
- **수정** `web/src/lib/useData.ts` — `saveOverlay` patch 타입에 신규 필드; featured 저장 헬퍼(선택).
- **수정** `web/src/types.ts` — `Item` 필드 추가.
- **수정** `web/src/index.css` — `.featured-*`, `.detail-*` 클래스(다크). 기존 `.case-*`·`.modal-*` 정리.
- **마이그레이션** — Supabase 신규 컬럼 + RLS update 컬럼 확장.

## 7. 엣지 케이스

- Featured 0개 → 섹션 숨김. 1~4개 → 그 수만큼.
- rank 중복/누락 → UI에서 1~5 유일 강제(스왑), 렌더는 정렬 후 slice(5). rank>5는 무시.
- 이미지 0장 → 갤러리 블록 숨김(플레이스홀더 없음).
- 링크 0개 → 링크 블록 숨김.
- 커버 없음 → thumbnail → asset_images[0] → (그래도 없으면) 뉴트럴 배경.
- 익명화: 별도 PII 토글 없음. 담당자가 `featured_kicker`/`featured_headline`/`custom_description`에 직접 익명 표기.

## 8. 범위 밖 (Non-goals)

- 5단(배경/문제/설계/실행/결과) 구조형 케이스 뷰 — 폐기(상세는 표준 스택 공용).
- Featured 자동 순환/캐러셀 — 고정 5개.
- 성과 숫자 전용 KPI 블록/차트 — 숫자는 큐레이션 텍스트에 산문으로.
- 필터가 Featured에 적용되는 동작 — Featured는 필터 무관 고정.
- CI·sync·소구포인트 AI 분류 등 기존 미결 이슈 — 본 작업 범위 밖.

## 9. 테스트

- **단위**: featured 선택 로직(정렬·slice·rank 유일성), 필드 fallback 체인(cover/headline/subtitle/links).
- **RLS**: 비로그인은 featured 미승인 행 미노출; 스태프는 전체 + featured 컨트롤 update 성공.
- **렌더**: Showcase에 FeaturedSection 삽입 순서, DetailView 스택 순서, 0/1/부분 featured, 이미지·링크 없는 항목.
- **E2E(수동)**: 스태프 로그인 → 상세 편집모드 → Featured 지정+순서+큐레이션 문구 저장 → Showcase 반영 확인.
- 프로덕션 빌드(`npm run build`) 통과, 깨진 이미지 0.
