import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import type { ParsedFields, AiFields } from "./types.js";
import { INDUSTRIES, FORMATS, MOODS } from "./vocab.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

export function buildClassifyPrompt(p: ParsedFields): string {
  return `다음 영상 포트폴리오 제작물을 분류해 JSON으로만 답하라.
썸네일 이미지가 첨부된 경우 이미지를 직접 보고 크리에이티브 라벨을 붙여라.

광고주: ${p.client}
프로젝트: ${p.project_title}
개요: ${p.overview}

규칙:
- industry: 다음 중 하나 — ${INDUSTRIES.join(", ")} (없으면 가장 가까운 것, 정말 없으면 "기타")
- format_concept: 다음에서 1~3개 — ${FORMATS.join(", ")} (새 개념이 꼭 필요하면 추가 가능)
- mood: 다음에서 1~3개 — ${MOODS.join(", ")}
- keywords: 검색에 쓸 자유 키워드 3~6개 (출연 셀럽, 제품, 소재 등)
- search_summary: 한 문장 한국어 요약
- visual_style: 이미지를 보고 시각적 스타일 1~3개 (예: 미니멀, 볼드, 시네마틱, 팝, 클린, 다이나믹, 그런지, 레트로, 모던, 럭셔리)
- color_tone: 이미지를 보고 색감 1~2개 (예: 웜톤, 쿨톤, 모노크롬, 비비드, 파스텔, 다크앤무디, 네온, 어스톤)
- animation_type: 이미지/개요를 보고 제작 형식 1~2개 (예: 3D, 2D모션그래픽, 라이브액션, 타이포그래피, 스톱모션, CG합성, AI생성)
- creative_direction: 이미지/개요를 보고 크리에이티브 방향 1~2개 (예: 제품쇼케이스, 브랜드스토리, 캐릭터, 내러티브, 인포그래픽, 뮤직비디오, 감성영상, 유머)

\`\`\`json
{"industry":"","format_concept":[],"mood":[],"keywords":[],"search_summary":"","visual_style":[],"color_tone":[],"animation_type":[],"creative_direction":[]}
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
    visual_style: o.visual_style ?? [],
    color_tone: o.color_tone ?? [],
    animation_type: o.animation_type ?? [],
    creative_direction: o.creative_direction ?? [],
    _ai_confidence: "estimated",
  };
}

export async function classify(p: ParsedFields): Promise<AiFields> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // 썸네일 이미지를 base64로 읽어 Vision 입력으로 추가
  let content: Anthropic.Messages.MessageParam["content"];
  const thumbPath = p.thumbnail; // "thumbnails/xxx.png" 상대경로
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
