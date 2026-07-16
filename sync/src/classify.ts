// sync/src/classify.ts
// 소구포인트 AI 분류 (유일한 AI 추정 축 — 나머지는 파싱·마스터 파생으로 '정확').
// 프롬프트 빌더·응답 파서는 순수 함수, API 호출만 I/O.
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "node:fs";
import type { AiFields } from "./types.js";
import { APPEAL_POINTS } from "./vocab.js";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export interface ClassifyInput {
  client: string;
  title: string;
  overview: string;
  thumbnail?: string | null; // 로컬 경로 (있으면 비전 입력)
}

export function buildClassifyPrompt(p: ClassifyInput): string {
  const appeals = APPEAL_POINTS.filter((a) => a !== "기타");
  return `다음 광고 크리에이티브의 소구포인트를 분류해 JSON으로만 답하라.
썸네일 이미지가 첨부된 경우 이미지를 직접 보고 판단하라.

광고주: ${p.client}
제목: ${p.title}
설명: ${p.overview || "(없음)"}

규칙:
- appeal_points: 다음 중 주 소구 1개 (+ 뚜렷하면 보조 1개, 최대 2개) — ${appeals.join(", ")}
  어디에도 안 맞으면 "기타" 1개만.
- keywords: 검색용 자유 키워드 2~5개 (출연 셀럽, 제품명, 컨셉, 특이소재 등)
- search_summary: 검색·소개에 쓸 한 문장 한국어 요약

\`\`\`json
{"appeal_points":[],"keywords":[],"search_summary":""}
\`\`\``;
}

export function parseClassifyResponse(text: string): AiFields {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("분류 응답에서 JSON을 찾지 못함: " + text.slice(0, 200));
  const o = JSON.parse(m[0]);
  const valid = new Set<string>(APPEAL_POINTS);
  const appeals = (Array.isArray(o.appeal_points) ? o.appeal_points : [])
    .filter((a: string) => valid.has(a))
    .slice(0, 2);
  return {
    appeal_points: appeals.length ? appeals : ["기타"],
    keywords: o.keywords ?? [],
    search_summary: o.search_summary ?? "",
    _ai_confidence: "estimated",
  };
}

export async function classify(p: ClassifyInput): Promise<AiFields> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
    max_tokens: 400,
    messages: [{ role: "user", content }],
  });
  const text = res.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  return parseClassifyResponse(text);
}
