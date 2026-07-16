import Anthropic from "@anthropic-ai/sdk";

interface SummaryItem {
  id: string; client: string; title: string; overview: string;
  search_summary: string; keywords: string[]; appeal_points: string[];
  industry: string | null; category_group: string | null;
  source_team: string; content_type: string[]; tools: string[];
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") { res.status(405).end(); return; }
  const { query, items } = req.body as { query: string; items: SummaryItem[] };
  if (!query || !Array.isArray(items)) { res.status(400).json({ error: "query/items 필요" }); return; }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";
  const catalog = items
    .map((i) => `${i.id} | ${i.client} | ${i.title} | ${i.overview} | ${i.industry ?? "-"} | ${i.source_team} | ${i.content_type.join(",")} | ${(i.appeal_points ?? []).join(",")} | ${(i.tools ?? []).join(",")} | ${(i.keywords ?? []).join(",")} | ${i.search_summary}`)
    .join("\n");
  const msg = await client.messages.create({
    model,
    max_tokens: 500,
    system: "너는 광고대행사 크리덴셜(제작물) 검색 엔진이다. 사용자 질의에 가장 잘 맞는 항목 id를 관련도 높은 순으로 JSON 배열로만 답한다. 관련 없으면 제외. 형식: {\"ids\":[\"id1\",\"id2\"]}",
    messages: [{ role: "user", content: `질의: ${query}\n\n후보(id | 광고주 | 제목 | 설명 | 업종 | 소스팀 | 콘텐츠 | 소구 | AI도구 | 키워드 | 요약):\n${catalog}` }],
  });
  const text = msg.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const m = text.match(/\{[\s\S]*\}/);
  const ids: string[] = m ? (JSON.parse(m[0]).ids ?? []) : [];
  res.status(200).json({ ids });
}
