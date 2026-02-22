import { z } from "zod";

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  perspective: z.string(),
  color: z.string(),
  emoji: z.string(),
});

export const AgentsOutputSchema = z.object({
  agents: z.array(AgentSchema),
});

export const DecisionOutputSchema = z.object({
  decision: z.string().describe("A clear, definitive answer or verdict to the question"),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence level 0-100 based on debate consensus"),
  keyArguments: z.array(
    z.object({
      agentId: z.string(),
      argument: z.string().describe("One-sentence key argument from this agent"),
    })
  ),
});

export function getAgentCountHeuristic(question: string): number {
  const lower = question.toLowerCase();
  if (lower.includes("supreme court") || lower.includes("justices")) return 9;
  if (
    lower.includes("senate") ||
    lower.includes("congress") ||
    lower.includes("committee")
  )
    return 5;
  return 4;
}

export function buildAgentGeneratorPrompt(
  question: string,
  count: number,
  agentSpecs?: { name: string; description: string }[]
): { system: string; user: string } {
  if (agentSpecs && agentSpecs.length > 0) {
    return {
      system: `You are an expert at creating AI debate agents. Given user-specified agents, create detailed agent profiles with distinct perspectives relevant to the question.`,
      user: `Question: "${question}"

User has specified these agents:
${agentSpecs.map((a, i) => `${i + 1}. ${a.name}: ${a.description}`).join("\n")}

For each agent, create a complete profile. Assign each a unique color from: blue, emerald, violet, amber, rose, cyan, orange, teal, indigo, pink. Assign a relevant emoji. Return exactly ${agentSpecs.length} agents as JSON.`,
    };
  }

  return {
    system: `You are an expert at creating diverse AI debate panels. Given a question, you create ${count} agents with genuinely distinct perspectives that will produce insightful debate.`,
    user: `Question: "${question}"

Create ${count} diverse agents who will debate this question. Make them:
- Have genuinely different perspectives (not just "pro" and "con")
- Represent different disciplines, ideologies, or expertise areas relevant to the question
- Have memorable names and clear roles
- Each get a unique color from: blue, emerald, violet, amber, rose, cyan, orange, teal, indigo, pink
- Each get a relevant emoji

Return exactly ${count} agents as JSON with fields: id (snake_case), name, role, perspective (2-3 sentences describing their viewpoint), color, emoji.`,
  };
}

export function buildAgentDebaterPrompt(
  agent: { name: string; role: string; perspective: string },
  question: string,
  round: number,
  totalRounds: number,
  priorMessages: { agentName: string; content: string; round: number }[]
): { system: string; user: string } {
  const roundContext =
    round === 1
      ? "This is the opening round. Present your core argument."
      : round === totalRounds
      ? "This is the final round. Synthesize prior discussion and make your closing argument."
      : "This is the middle round. Respond to other agents' arguments and develop your position.";

  const priorContext =
    priorMessages.length > 0
      ? `\n\nPrior debate messages:\n${priorMessages
          .map((m) => `[Round ${m.round}] ${m.agentName}: ${m.content.slice(0, 500)}...`)
          .join("\n\n")}`
      : "";

  return {
    system: `You are ${agent.name}, ${agent.role}.

Your perspective: ${agent.perspective}

You have access to a web search tool. Use it proactively when your argument benefits from current data, recent statistics, or specific facts you are unsure about. You may search multiple times. Incorporate results naturally with attribution (e.g., "According to [source]...").

Stay fully in character. Be intellectually rigorous, specific, and persuasive. Engage directly with the question and, in later rounds, with other agents' arguments. Write 3-5 substantive paragraphs.`,
    user: `Question under debate: "${question}"

Round ${round} of ${totalRounds}. ${roundContext}${priorContext}

Deliver your argument now:`,
  };
}

export function buildSummarizerPrompt(
  question: string,
  messages: { agentName: string; content: string; round: number }[]
): { system: string; user: string } {
  const transcript = messages
    .map((m) => `[Round ${m.round}] ${m.agentName}:\n${m.content}`)
    .join("\n\n---\n\n");

  return {
    system: `You are a neutral, brilliant analyst who synthesizes complex debates into clear conclusions. You identify consensus, key disagreements, and the weight of evidence to reach a definitive verdict.`,
    user: `Question: "${question}"

Full debate transcript:
${transcript}

Write a comprehensive synthesis (4-6 paragraphs) that:
1. Identifies the strongest arguments from each perspective
2. Notes where agents agreed or converged
3. Weighs the evidence and reasoning quality
4. Reaches a definitive verdict with your confidence level

Be analytical and direct. Do not hedge excessively.`,
  };
}

export function buildDecisionPrompt(
  question: string,
  summary: string,
  agentIds: string[]
): { system: string; user: string } {
  return {
    system: `You extract structured verdicts from debate summaries. Return precise JSON matching the schema.`,
    user: `Question: "${question}"

Summary: ${summary}

Agent IDs: ${agentIds.join(", ")}

Extract: a definitive decision/verdict (2-3 sentences), a confidence score (0-100), and one key argument per agent. Return as JSON.`,
  };
}
