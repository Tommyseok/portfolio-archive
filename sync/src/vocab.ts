// sync/src/vocab.ts
// AE 세일즈·검색 기준으로 설계된 라벨 vocab

export const INDUSTRIES = [
  "뷰티", "식품/음료", "패션/의류", "헬스케어/제약",
  "금융/핀테크", "이커머스/플랫폼", "엔터테인먼트/미디어",
  "게임", "IT/테크", "자동차", "교육", "공공/정부",
  "유통/리테일", "기타",
] as const;

/** 집행 매체 — "이 플랫폼에서 쓸 수 있는 레퍼런스" */
export const PLATFORMS = [
  "유튜브", "유튜브쇼츠", "인스타그램", "틱톡",
  "TV/OTT", "앱광고", "웹배너", "옥외광고",
] as const;

/** 캠페인 목적 — "어떤 목표의 캠페인이었나" */
export const CAMPAIGN_OBJECTIVES = [
  "브랜드인지", "신제품론칭", "시즌/프로모션",
  "퍼포먼스/전환", "기업PR", "채용", "팬덤/커뮤니티", "리브랜딩",
] as const;

/** 타겟 고객층 — "누구를 설득해야 하는 고객인가" */
export const TARGET_AUDIENCES = [
  "MZ세대(1020)", "2030여성", "2030남성",
  "3040", "4050이상", "가족/키즈", "B2B", "전연령",
] as const;

/** 제작 방식 — "어떻게 만들었나" */
export const PRODUCTION_TYPES = [
  "실사촬영", "모션그래픽", "3D애니메이션",
  "실사+CG합성", "AI활용", "타이포그래픽", "스톱모션",
] as const;

/** 비주얼 무드 — "어떤 느낌인가" (시각적 레퍼런스 매칭용) */
export const VISUAL_MOODS = [
  "감성/따뜻한", "유머러스", "역동적/에너제틱", "세련된/럭셔리",
  "미니멀/클린", "다크/무드있는", "팝/컬러풀", "시네마틱", "트렌디",
] as const;

// 하위호환용 — classify.ts 참조
export const FORMATS = PRODUCTION_TYPES;
export const MOODS = VISUAL_MOODS;
