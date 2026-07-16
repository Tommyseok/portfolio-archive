# 크리덴셜 대시보드 — 컨텍스트

- **Last Updated**: 2026-07-16 (스파이크 완료·파서 구현 반영)

## 덱 구조 핵심 (스파이크 결과)

- **DS덱**: 슬라이드 안 메타 표 `DATE/CLIENT/TEAM/TOOL/USE` (332/362장). 표 없는 슬라이드=표지·월구분·"<원본>" 참고. 텍스트는 shape가 아닌 **table 요소**에 있음 (파싱 시 tableRows 순회 필수).
- **MS덱**: 메타 표 `제작일자/광고주/특이사항` (67/78장) + 이미지마다 드롭박스 mp4 링크 (총 184개). 드롭박스 URL의 한글 파일명은 소실됨.
- **광고주 표기 변형**: "(비딩)"·"비딩" 접미사 → `is_bidding` 플래그로 분리, 공백·대소문자 정규화 (`advertiserMaster.ts normClient`).
- **덱 간 objectId 충돌 있음** (같은 템플릿) → 썸네일 파일명에 DS-/MS- 접두사.
- 소구포인트 확정(심플 7+기타): 후기/추천, 공감, 정보/꿀팁, 유머/밈, 혜택/가격, 제품/효능, 감성/브랜드.
- 셀럽·전문가는 소구 축이 아닌 keywords로 (자연어 검색 커버).
- **작업 폴더**: `C:\Users\MADUP\Desktop\01_프로젝트\Credential\` (구 `Claude_Projects\portfolio-archive` 복사본)
- **배포**: https://portfolio-archive-three.vercel.app/ | GitHub: Tommyseok/portfolio-archive (브랜치 phase1-archive)
- **CI**: GitHub Actions sync.yml — 매일 KST 09:00 sync+배포

## 소스 인벤토리

| # | 소스 | ID/링크 | 규모 | 상태 |
|---|---|---|---|---|
| 1 | DS팀 생성형AI 크리에이티브 (슬라이드) | `1mz68G3ix4P4cwfvHRHD6fnBzqzzDL8VjkcuWB9LHRPI` | 362장 | 접근 OK, 미파싱 |
| 2 | MS팀 생성형 AI 영상 취합 (슬라이드) | `1PfYn2BaOSC_HaHcCxHVynn0ISwtSbCxdNk3_hhioTq0` | 78장 | 접근 OK, 미파싱 |
| 3 | PD팀 촬영숏폼·스틸·AI영상 (슬라이드) | `1gkATsneTHnLjxJLhVnTF0GiZKAab8WMYt7843uJ03ZE` | 204장→146건 | 동기화 완료 |
| 4 | 매드업 제작영상_카테고리별 취합 (드롭박스) | dropbox.com/scl/fo/l64lbs1yyrfwkc29w00d0/... | 미확인 | Phase B |
| 5 | MS팀 AI 활용 영상 (드롭박스) | dropbox.com/scl/fo/t4rnrxpcxki1ihtexwdvq/... | 미확인 | Phase B (②와 중복 의심) |

## 업종/유형 진실원천

- **정기회의시트**: `1Z1qYuWo2dQPWn84v_rjGwJ0A-Tlzs4FGU_9rqd1SuG4` — **캠페인 탭**, 헤더 16행
- G열=광고주 사업자명, H열=캠페인명, N열=업종 분류, O열=유형 분류(브랜드·서비스/플랫폼)
- 관측된 업종 어휘: 뷰티, 패션, 식품/음료, 건강/헬스케어, 라이프스타일/생활, 전기/전자, 금융/핀테크, 보험/화재/생명, 교육, 자동차/모빌리티, 게임, 엔터테인먼트/미디어, IT/테크, 커머스, 광고/마케팅
- 주의: 솔루션사업부 행 대부분과 일부 신규 행은 N/O열이 비어있음 → 마스터에서 제안값+검수 플래그로 처리
- 읽기 방식: Google Sheets MCP (Node 토큰에는 sheets 스코프 없음 — 자동화하려면 재인증 필요)

## 결정 사항

- 2026-07-16: 분류 하이브리드 확정 (객관 축 자동, 소구포인트만 AI+검수)
- 2026-07-16: 드롭박스 Phase B로 보류
- 2026-07-16: 구 AE 라벨 스키마 폐기
- 미결: 소구포인트 리스트 (사용자 수정 의견 대기)

## 인프라 (Phase C, 2026-07-16)

- **Supabase**: 프로젝트 `madup-pricing-prod` (nfwpdowrggvwbxroyury, 서울) 공용 — 테이블 `credential_items`(579행), 버킷 `credential-images`
  - RLS: 비로그인=showcase_approved만 / @madup.com=전체 조회+편집레이어 update / insert·delete=service_role
  - anon 키는 web/src/lib/supabase.ts 에 하드코딩 (공개 키, RLS로 보호)
- **Vercel**: 신규 프로젝트 `madup-credential` (tommy-s-projects21 팀, 현 로그인 계정). 구 프로젝트 portfolio-archive(-three URL)는 다른 Vercel 계정 소유라 접근 불가 → 새 프로젝트로 이관
  - 로컬 CLI 인증 완료 (device flow). CI의 VERCEL_TOKEN 은 만료 — 사용자 교체 필요
  - GitHub Secrets: VERCEL_ORG_ID/PROJECT_ID 는 새 프로젝트로 갱신됨 (2026-07-16)
- **CI**: sync.yml(매일 09시, 5일+ 연속 실패 중 — 원인 확인 필요), deploy.yml(수동 배포 전용, 토큰 교체 후 사용 가능)
- **로그인**: 매직링크(기본 SMTP, 시간당 발송 제한) — Google OAuth 프로바이더 연결 권장(대시보드 수동)

## 관련 문서
- 원 설계: `docs/superpowers/specs/2026-05-27-portfolio-archive-design.md`
- 분류 논의 원본: https://claude.ai/share/78c3499d-164b-44c2-b3cc-5935b7fba0e1 (2뎁스, 광고주 마스터, 소구 폐쇄형 리스트)
