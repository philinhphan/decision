import { tavily } from "@tavily/core";

export async function performWebSearch(question: string): Promise<string> {
  const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
  const response = await client.search(question, { maxResults: 5 });

  const parts: string[] = [];
  if (response.answer) parts.push(`Summary: ${response.answer}`);
  for (const r of response.results ?? []) {
    const content = (r.content ?? "").slice(0, 300);
    parts.push(`[${r.title ?? ""}] ${content}`);
  }
  return parts.join("\n\n");
}
