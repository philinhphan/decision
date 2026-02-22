import { tool } from "ai";
import { tavily } from "@tavily/core";
import { z } from "zod";

const webSearchInputSchema = z.object({
  query: z.string().describe("Specific, focused search query"),
});

export const webSearchTool = tool({
  description:
    "Search the web for current information, recent statistics, or facts. Use when your argument needs up-to-date data.",
  inputSchema: webSearchInputSchema,
  execute: async ({ query }) => {
    const client = tavily({ apiKey: process.env.TAVILY_API_KEY! });
    const response = await client.search(query, { maxResults: 5 });
    return {
      query,
      answer: response.answer ?? "",
      results: (response.results ?? []).map((r) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        content: (r.content ?? "").slice(0, 500),
      })),
    };
  },
});
