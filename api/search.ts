import Anthropic from "@anthropic-ai/sdk";

interface SummaryItem { id: string; client: string; project_title: string; search_summary: string; keywords: string[]; format_concept: string[]; mood: string[]; industry: string; }

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  const { query, items } = req.body as { query: string; items: SummaryItem[] };
  if (!query || !Array.isArray(items)) { res.status(400).json({ error: "query/items 필요" }); return; }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-5";
  const catalog = items
    .map((i) => `${i.id} | ${i.client} | ${i.project_title} | ${i.industry} | ${i.format_concept.join(",")} | ${i.mood.join(",")} | ${i.keywords.join(",")} | ${i.search_summary}`)
    .join("\n");
  const msg = await client.messages.create({
    model,
    max_tokens: 400,
    system: "너는 영상 포트폴리오 검색 엔진이다. 사용자 질의에 가장 잘 맞는 항목 id를 관련도 높은 순으로 JSON 배열로만 답한다. 관련 없으면 제외한다. 형식: {\"ids\":[\"id1\",\"id2\"]}",
    messages: [{ role: "user", content: `질의: ${query}\n\n후보(id | 광고주 | 프로젝트 | 업종 | 포맷 | 무드 | 키워드 | 요약):\n${catalog}` }],
  });
  const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const m = text.match(/\{[\s\S]*\}/);
  const ids: string[] = m ? (JSON.parse(m[0]).ids ?? []) : [];
  res.status(200).json({ ids });
}
