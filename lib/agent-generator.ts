import { model } from "@/lib/ai";
import { generateObject } from "ai";
import { nanoid } from "nanoid";
import { AgentSchema, AgentsOutputSchema, buildAgentGeneratorPrompt, getAgentCountHeuristic } from "./prompts";
import { getColorForIndex } from "./colors";
import type { Agent, AgentSpec } from "./types";
import { z } from "zod";
import { pickVoiceIdForIndex } from "./voices";

const EMOJIS = ["⚖️", "🏛️", "📊", "🔬", "💡", "🌍", "💼", "📚", "🎯", "🧠"];

export async function generateAgents(
  question: string,
  agentSpecs?: AgentSpec[]
): Promise<Agent[]> {
  const count = agentSpecs?.length ?? getAgentCountHeuristic(question);
  const { system, user } = buildAgentGeneratorPrompt(question, count, agentSpecs);

  const result = await generateObject({
    model,
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
  });

  const generated = result.object.agents;

  const normalizeName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, " ");

  if (agentSpecs && agentSpecs.length > 0) {
    const generatedByName = new Map<string, (typeof generated)[number]>();
    for (const g of generated) generatedByName.set(normalizeName(g.name), g);

    return agentSpecs.map((spec, i) => {
      const match = generatedByName.get(normalizeName(spec.name)) ?? generated[i];
      return {
        id: match?.id || nanoid(8),
        name: spec.name,
        role: match?.role ?? "",
        perspective: match?.perspective ?? "",
        color: match?.color || getColorForIndex(i),
        emoji: match?.emoji || EMOJIS[i % EMOJIS.length],
        voiceId: spec.voiceId?.trim() || pickVoiceIdForIndex(i),
        imageUrl: spec.imageUrl,
      };
    });
  }

  return generated.map((agent, i) => ({
    id: agent.id || nanoid(8),
    name: agent.name,
    role: agent.role,
    perspective: agent.perspective,
    color: agent.color || getColorForIndex(i),
    emoji: agent.emoji || EMOJIS[i % EMOJIS.length],
    voiceId: pickVoiceIdForIndex(i),
  }));
}
