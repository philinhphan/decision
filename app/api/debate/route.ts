import { openai } from "@ai-sdk/openai";
import { generateObject, streamText } from "ai";
import { nanoid } from "nanoid";
import { generateAgents } from "@/lib/agent-generator";
import {
  buildAgentDebaterPrompt,
  buildSummarizerPrompt,
  buildDecisionPrompt,
  computeVoteTally,
  DecisionOutputSchema,
} from "@/lib/prompts";
import type { Agent, AgentSpec, Message, SSEEvent, StanceLevel } from "@/lib/types";
import { performWebSearch } from "@/lib/tools";

export const maxDuration = 300;

function sseEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// Emotion cue pattern: a short parenthetical like (firmly) or (with conviction)
// at the very start of the text (after stance tag is stripped)
const EMOTION_CUE_RE = /^\s*\([^)]{1,40}\)\s*/;

function stripEmotionCue(text: string): string {
  return text.replace(EMOTION_CUE_RE, "");
}

function parseStance(content: string): {
  displayContent: string;   // shown to user — no stance tag, no emotion cue
  spokenContent: string;    // sent to TTS — no stance tag, no emotion cue (ElevenLabs reads parens literally)
  stance?: StanceLevel;
} {
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
        const afterStance = content.replace(pattern, "").trim();
        const clean = stripEmotionCue(afterStance);
        return {
          spokenContent: clean,    // strip emotion cue — ElevenLabs reads parens literally
          displayContent: clean,
          stance: stanceNum as StanceLevel,
        };
      }
    }
  }
  const clean = stripEmotionCue(content);
  return {
    spokenContent: clean,
    displayContent: clean,
  };
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
        // Step 1: Start web search and agent generation in parallel
        send({ type: "search_start", query: question });
        const webSearchPromise = performWebSearch(question).catch(() => undefined);

        const agents: Agent[] = await generateAgents(question, agentSpecs);
        send({ type: "agents_ready", agents });

        // Web context starts undefined; populated before round 2 starts
        let webContext: string | undefined;
        const webContextReady = webSearchPromise.then((ctx) => {
          webContext = ctx;
          send({ type: "search_done" });
        });

        const totalRounds = 3;
        const allMessages: Message[] = [];

        // Step 3: Run debate rounds — all agents think in parallel per round
        for (let round = 1; round <= totalRounds; round++) {
          send({ type: "round_start", round, totalRounds });

          // Snapshot context at the start of this round (each agent sees the same prior state)
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

          // Launch all agents simultaneously
          const roundMessages = await Promise.all(
            agents.map(async (agent) => {
              const messageId = nanoid(8);
              send({ type: "agent_start", agentId: agent.id, messageId, voiceId: agent.voiceId });

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

              // Parse stance and split display vs. spoken content
              const { displayContent, spokenContent, stance } = parseStance(content);

              const message: Message = {
                id: messageId,
                agentId: agent.id,
                content: displayContent,
                spokenContent,
                round,
                timestamp: Date.now(),
                voiceId: agent.voiceId,
                stance, // store for vote tally computation after all rounds
              };

              // Each agent signals done as soon as they finish
              send({ type: "agent_done", agentId: agent.id, messageId, stance, spokenContent });

              return message;
            })
          );

          // Add all round messages to history for the next round
          allMessages.push(...roundMessages);
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

        // Step 5: Compute ground-truth vote tally from final stances, then generate decision
        const tallyMessages = allMessages.map((m) => {
          const a = agents.find((ag) => ag.id === m.agentId);
          return {
            agentId: m.agentId,
            agentName: a?.name ?? "Unknown",
            round: m.round,
            stance: m.stance,
          };
        });
        const tally = computeVoteTally(tallyMessages);

        const { system: decSystem, user: decUser } = buildDecisionPrompt(
          question,
          summaryText,
          tally
        );

        const decisionResult = await generateObject({
          model: openai("gpt-4o-mini"),
          system: decSystem,
          prompt: decUser,
          schema: DecisionOutputSchema,
          temperature: 0.1, // very low — must follow the tally faithfully
        });

        send({
          type: "decision_ready",
          decision: decisionResult.object.decision,
          confidence: decisionResult.object.confidence,
          keyArguments: decisionResult.object.keyArguments,
          forCount: tally.forCount,
          againstCount: tally.againstCount,
          totalVoters: tally.totalVoters,
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
