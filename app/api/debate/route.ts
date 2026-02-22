import { model } from "@/lib/ai";
import { generateObject, streamText, stepCountIs } from "ai";
import { nanoid } from "nanoid";
import { generateAgents } from "@/lib/agent-generator";
import {
  buildAgentDebaterPrompt,
  buildSummarizerPrompt,
  buildDecisionPrompt,
  DecisionOutputSchema,
} from "@/lib/prompts";
import type { Agent, AgentSpec, Message, SSEEvent, StanceLevel } from "@/lib/types";
import { webSearchTool } from "@/lib/tools";

export const maxDuration = 300;

function sseEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function parseStance(content: string): { cleanContent: string; stance?: StanceLevel } {
  // Try multiple patterns to find stance
  const patterns = [
    /\[STANCE:\s*(\d)\]/i,           // [STANCE: 4]
    /\[STANCE\s*(\d)\]/i,            // [STANCE 4]
    /STANCE:\s*(\d)/i,               // STANCE: 4
    /^\s*\[(\d)\]/m,                 // [4] at start of line
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
  const { question, agents: agentSpecs }: { question: string; agents?: AgentSpec[] } =
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

        const totalRounds = 8;
        const allMessages: Message[] = [];

        // Step 2: Run debate rounds
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
              lastMsg
            );

            let content = "";

            const result = await streamText({
              model,
              system,
              prompt: user,
maxOutputTokens: 600,
              tools: { webSearch: webSearchTool },
              stopWhen: stepCountIs(5),
            });

            for await (const chunk of result.fullStream) {
              if (chunk.type === "text-delta") {
                content += chunk.text;
                send({ type: "agent_token", agentId: agent.id, messageId, token: chunk.text });
              } else if (chunk.type === "tool-call") {
                const query = (chunk.input as { query: string }).query ?? "";
                send({ type: "agent_search_start", agentId: agent.id, messageId, query });
              } else if (chunk.type === "tool-result") {
                send({ type: "agent_search_done", agentId: agent.id, messageId });
              }
            }

            // Parse stance from content
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

        // Step 3: Stream summary
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
          summaryContext
        );

        let summaryText = "";
        const summaryResult = await streamText({
          model,
          system: sumSystem,
          prompt: sumUser,
          maxOutputTokens: 800,
        });

        for await (const chunk of summaryResult.textStream) {
          summaryText += chunk;
          send({ type: "summary_token", token: chunk });
        }

        send({ type: "summary_done" });

        // Step 4: Generate structured decision
        const { system: decSystem, user: decUser } = buildDecisionPrompt(
          question,
          summaryText,
          agents.map((a) => a.id)
        );

        const decisionResult = await generateObject({
          model,
          system: decSystem,
          prompt: decUser,
          schema: DecisionOutputSchema,
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
