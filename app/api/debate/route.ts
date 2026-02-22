import { openai } from "@ai-sdk/openai";
import { generateObject, streamText } from "ai";
import { nanoid } from "nanoid";
import { generateAgents } from "@/lib/agent-generator";
import {
  buildAgentDebaterPrompt,
  buildSummarizerPrompt,
  buildDecisionPrompt,
  DecisionOutputSchema,
} from "@/lib/prompts";
import type { Agent, AgentSpec, Message, SSEEvent, StanceLevel } from "@/lib/types";
import { performWebSearch } from "@/lib/tools";

export const maxDuration = 300;

function sseEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function parseStance(content: string): { cleanContent: string; stance?: StanceLevel } {
  const patterns = [
    /\[STANCE:\s*(\d)\]/i,
    /\[STANCE\s*(\d)\]/i,
    /STANCE:\s*(\d)/i,
    /^\s*\[(\d)\]/m,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const stanceNum = parseInt(match[1], 10);
      if (stanceNum >= 1 && stanceNum <= 6) {
        const cleanContent = content.replace(pattern, "").trim();
        return { cleanContent, stance: stanceNum as StanceLevel };
      }
    }
  }
  return { cleanContent: content };
}

export async function POST(req: Request) {
  const { question, agents: agentSpecs, fileContext }: { question: string; agents?: AgentSpec[]; fileContext?: string } =
    await req.json();

  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "Question is required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(sseEvent(event)));
      };

      try {
        // Step 1: Generate agents
        const agents: Agent[] = await generateAgents(question, agentSpecs);
        send({ type: "agents_ready", agents });

        // Step 2: Single upfront web search shared across all agents (optional)
        let webContext = "";
        try {
          send({ type: "search_start", query: question });
          webContext = await performWebSearch(question);
          send({ type: "search_done" });
        } catch {
          // Web search failed, continue without it
          send({ type: "search_done" });
        }

        const totalRounds = 3;
        const allMessages: Message[] = [];

        // Step 3: Run debate rounds
        for (let round = 1; round <= totalRounds; round++) {
          send({ type: "round_start", round, totalRounds });

          for (const agent of agents) {
            const messageId = nanoid(8);
            send({ type: "agent_start", agentId: agent.id, messageId });

            // Build prior context for this agent
            const priorMessages = allMessages.map((m) => {
              const msgAgent = agents.find((a) => a.id === m.agentId);
              return {
                agentName: msgAgent?.name ?? "Unknown",
                content: m.content,
                round: m.round,
              };
            });

            const lastMsg =
              allMessages.length > 0
                ? (() => {
                  const last = allMessages[allMessages.length - 1];
                  const lastAgent = agents.find((a) => a.id === last.agentId);
                  return { agentName: lastAgent?.name ?? "Unknown", content: last.content };
                })()
                : null;

            const { system, user } = buildAgentDebaterPrompt(
              agent,
              question,
              round,
              totalRounds,
              priorMessages,
              lastMsg,
              webContext,
              fileContext
            );

            let content = "";

            const result = await streamText({
              model: openai("gpt-4o-mini"),
              system,
              prompt: user,
              maxOutputTokens: 80,
              temperature: 0.85,
            });

            for await (const chunk of result.textStream) {
              content += chunk;
              send({ type: "agent_token", agentId: agent.id, messageId, token: chunk });
            }

            // Parse stance from response
            const { cleanContent, stance } = parseStance(content);

            allMessages.push({
              id: messageId,
              agentId: agent.id,
              content: cleanContent,
              round,
              timestamp: Date.now(),
            });

            send({ type: "agent_done", agentId: agent.id, messageId, stance });
          }
        }

        // Step 4: Stream summary
        const summaryContext = allMessages.map((m) => {
          const agent = agents.find((a) => a.id === m.agentId);
          return {
            agentName: agent?.name ?? "Unknown",
            content: m.content,
            round: m.round,
          };
        });

        const { system: sumSystem, user: sumUser } = buildSummarizerPrompt(
          question,
          summaryContext,
          fileContext
        );

        let summaryText = "";
        const summaryResult = await streamText({
          model: openai("gpt-4o-mini"),
          system: sumSystem,
          prompt: sumUser,
          maxOutputTokens: 800,
          temperature: 0.7,
        });

        for await (const chunk of summaryResult.textStream) {
          summaryText += chunk;
          send({ type: "summary_token", token: chunk });
        }

        send({ type: "summary_done" });

        // Step 5: Generate structured decision
        const { system: decSystem, user: decUser } = buildDecisionPrompt(
          question,
          summaryText,
          agents.map((a) => a.id)
        );

        const decisionResult = await generateObject({
          model: openai("gpt-4o-mini"),
          system: decSystem,
          prompt: decUser,
          schema: DecisionOutputSchema,
          temperature: 0.3,
        });

        send({
          type: "decision_ready",
          decision: decisionResult.object.decision,
          confidence: decisionResult.object.confidence,
          keyArguments: decisionResult.object.keyArguments,
        });

        send({ type: "done" });
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
