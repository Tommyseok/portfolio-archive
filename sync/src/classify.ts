import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import type { ParsedFields, AiFields } from "./types.js";
import { INDUSTRIES, PLATFORMS, CAMPAIGN_OBJECTIVES, TARGET_AUDIENCES, PRODUCTION_TYPES, VISUAL_MOODS } from "./vocab.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

export function buildClassifyPrompt(p: ParsedFields): string {
  return `다음 영상 포트폴리오 제작물을 AE(광고영업) 세일즈·검색 목적으로 분류해 JSON으로만 답하라.
썸네일 이미지가 첨부된 경우 이미지를 직접 보고 라벨을 붙여라.

광고주: ${p.client}
프로젝트: ${p.project_title}
개요: ${p.overview}

규칙:
- industry: 다음 중 하나 — ${INDUSTRIES.join(", ")}
- platform: 다음에서 1~3개 — ${PLATFORMS.join(", ")} (슬라이드/개요/이미지로 추정 가능한 것만)
- campaign_objective: 다음에서 1~2개 — ${CAMPAIGN_OBJECTIVES.join(", ")}
- target_audience: 다음에서 1~3개 — ${TARGET_AUDIENCES.join(", ")}
- production_type: 다음에서 1~2개 — ${PRODUCTION_TYPES.join(", ")}
- visual_mood: 다음에서 1~2개 — ${VISUAL_MOODS.join(", ")}
- keywords: 검색에 쓸 자유 키워드 3~6개 (출연 셀럽, 제품명, 캠페인명, 특이소재 등)
- search_summary: AE가 고객에게 설명할 수 있는 한 문장 한국어 요약
  (예: "아이유 출연 MZ 타겟 여름 탄산음료 신제품 론칭 유튜브 광고")

\`\`\`json
{"industry":"","platform":[],"campaign_objective":[],"target_audience":[],"production_type":[],"visual_mood":[],"keywords":[],"search_summary":""}
\`\`\``;
}

export function parseClassifyResponse(text: string): AiFields {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("분류 응답에서 JSON을 찾지 못함: " + text.slice(0, 200));
  const o = JSON.parse(m[0]);
  return {
    industry: o.industry ?? "기타",
    platform: o.platform ?? [],
    campaign_objective: o.campaign_objective ?? [],
    target_audience: o.target_audience ?? [],
    production_type: o.production_type ?? [],
    visual_mood: o.visual_mood ?? [],
    keywords: o.keywords ?? [],
    search_summary: o.search_summary ?? "",
    _ai_confidence: "estimated",
  };
}

export async function classify(p: ParsedFields): Promise<AiFields> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // 썸네일 이미지를 base64로 읽어 Vision 입력으로 추가
  let content: Anthropic.Messages.MessageParam["content"];
  const thumbPath = p.thumbnail;
  if (thumbPath && fs.existsSync(thumbPath)) {
    const imageData = fs.readFileSync(thumbPath).toString("base64");
    content = [
      {
        type: "image",
        source: { type: "base64", media_type: "image/png", data: imageData },
      } as Anthropic.Messages.ImageBlockParam,
      { type: "text", text: buildClassifyPrompt(p) },
    ];
  } else {
    content = buildClassifyPrompt(p);
  }

  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 600,
    messages: [{ role: "user", content }],
  });
  const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  return parseClassifyResponse(text);
}
