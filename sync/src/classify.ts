import Anthropic from "@anthropic-ai/sdk";
import type { ParsedFields, AiFields } from "./types.js";
import { INDUSTRIES, FORMATS, MOODS } from "./vocab.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";

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
    model: MODEL,
    max_tokens: 500,
    messages: [{ role: "user", content: buildClassifyPrompt(p) }],
  });
  const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  return parseClassifyResponse(text);
}
