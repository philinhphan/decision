import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { nanoid } from "nanoid";
import { AgentSchema, AgentsOutputSchema, buildAgentGeneratorPrompt, getAgentCountHeuristic } from "./prompts";
import { getColorForIndex } from "./colors";
import type { Agent, AgentSpec } from "./types";
import { z } from "zod";

const EMOJIS = ["⚖️", "🏛️", "📊", "🔬", "💡", "🌍", "💼", "📚", "🎯", "🧠"];

export async function generateAgents(
  question: string,
  agentSpecs?: AgentSpec[]
): Promise<Agent[]> {
  const count = agentSpecs?.length ?? getAgentCountHeuristic(question);
  const { system, user } = buildAgentGeneratorPrompt(question, count, agentSpecs);

  const result = await generateObject({
    model: openai("gpt-4o-mini"),
    system,
    prompt: user,
    schema: z.object({
      agents: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
          role: z.string(),
          perspective: z.string(),
          color: z.string(),
          emoji: z.string(),
        })
      ),
    }),
    temperature: 0.9,
  });

  return result.object.agents.map((agent, i) => ({
    id: agent.id || nanoid(8),
    name: agent.name,
    role: agent.role,
    perspective: agent.perspective,
    color: agent.color || getColorForIndex(i),
    emoji: agent.emoji || EMOJIS[i % EMOJIS.length],
  }));
}
