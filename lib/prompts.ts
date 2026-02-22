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
  decision: z.string().describe(
    "A clear, definitive verdict (2-3 sentences). MUST be consistent with the vote tally provided: if FOR > AGAINST the verdict is affirmative; if AGAINST > FOR the verdict is negative; if tied, say so explicitly."
  ),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Confidence 0-100, derived from the vote margin. Unanimous = ~95, strong majority = 70-85, slim majority = 50-65, tie = 50."
    ),
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

For each agent, create a complete profile. IMPORTANT:
- Return the agents in the exact same order as provided above.
- Do not rename the agents (keep their names exactly).
Assign each a unique color from: blue, emerald, violet, amber, rose, cyan, orange, teal, indigo, pink. Assign a relevant emoji. Return exactly ${agentSpecs.length} agents as JSON.`,
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
  priorMessages: { agentName: string; content: string; round: number }[],
  lastMessage?: { agentName: string; content: string } | null,
  webContext?: string,
  fileContext?: string
): { system: string; user: string } {
  const roundContext =
    round === 1
      ? "Opening — state your position clearly."
      : round === totalRounds
        ? "Final word — one crisp closing sentence, no new arguments."
        : "React to what was just said. Push back or build on it.";

  const historyMessages = (lastMessage ? priorMessages.slice(0, -1) : priorMessages).slice(-6);
  const priorContext =
    historyMessages.length > 0
      ? `\n\nRecent exchange:\n${historyMessages
        .map((m) => `${m.agentName}: ${m.content.slice(0, 150)}`)
        .join("\n")}`
      : "";

  const lastMessageBlock =
    lastMessage && round > 1
      ? `\n\n${lastMessage.agentName} just said: "${lastMessage.content.slice(0, 200)}"\n\nRespond to them directly — name them, then make your point.`
      : "";

  const webContextBlock = webContext
    ? `\n\nBackground research:\n${webContext.slice(0, 800)}`
    : "";

  const fileContextBlock = fileContext
    ? `\n\nUser-provided documents:\n${fileContext.slice(0, 3000)}`
    : "";

  return {
    system: `You are ${agent.name}, ${agent.role}. ${agent.perspective}

This is a live debate. Keep it short and sharp: 2-3 sentences maximum. Be direct, conversational, and combative when warranted. No lengthy explanations — one clear point per turn.

VOICE EMOTION INSTRUCTIONS (hidden from viewer, for audio synthesis only):
Naturally weave in one brief parenthetical emotion cue that reflects your feeling in that moment — e.g. (firmly), (with frustration), (leaning forward), (measured but resolute), (incredulous), (passionately), (with quiet conviction), (sighing), (sharply). Place it at the start of your spoken response, right after the stance tag. Keep it to 1-3 words in parentheses. Do not explain the cue; just use it naturally.`,
    user: `Debate question: "${question}"${webContextBlock}${fileContextBlock}

Turn ${round} of ${totalRounds}. ${roundContext}${priorContext}${lastMessageBlock}

CRITICAL: Start with [STANCE: X] where X is 1-6 (1=Strongly Disagree, 6=Strongly Agree). Then a parenthetical emotion cue. Then your response (2-3 sentences):`,
  };
}

export function buildSummarizerPrompt(
  question: string,
  messages: { agentName: string; content: string; round: number }[],
  fileContext?: string
): { system: string; user: string } {
  const transcript = messages
    .map((m) => `[Round ${m.round}] ${m.agentName}:\n${m.content}`)
    .join("\n\n---\n\n");

  const fileBlock = fileContext
    ? `\n\nUser-provided reference documents:\n${fileContext.slice(0, 3000)}`
    : "";

  return {
    system: `You are a neutral, brilliant analyst who synthesizes complex debates into clear conclusions. You identify consensus, key disagreements, and the weight of evidence to reach a definitive verdict.`,
    user: `Question: "${question}"${fileBlock}

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

export interface VoteTally {
  forCount: number;
  againstCount: number;
  totalVoters: number;
  averageStance: number;
  agentStances: { agentId: string; agentName: string; stance: number; finalRound: number }[];
}

/** Compute the ground-truth vote tally from each agent's FINAL stance. */
export function computeVoteTally(
  messages: { agentId: string; agentName: string; round: number; stance?: number }[],
): VoteTally {
  // Take each agent's latest recorded stance across all rounds
  const latestByAgent = new Map<string, { agentName: string; stance: number; round: number }>();

  for (const msg of messages) {
    if (msg.stance == null) continue;
    const existing = latestByAgent.get(msg.agentId);
    if (!existing || msg.round > existing.round) {
      latestByAgent.set(msg.agentId, {
        agentName: msg.agentName,
        stance: msg.stance,
        round: msg.round,
      });
    }
  }

  const agentStances = Array.from(latestByAgent.entries()).map(([agentId, v]) => ({
    agentId,
    agentName: v.agentName,
    stance: v.stance,
    finalRound: v.round,
  }));

  const forCount = agentStances.filter((a) => a.stance >= 4).length;
  const againstCount = agentStances.filter((a) => a.stance <= 3).length;
  const totalVoters = agentStances.length;
  const averageStance =
    totalVoters > 0
      ? agentStances.reduce((sum, a) => sum + a.stance, 0) / totalVoters
      : 3.5;

  return { forCount, againstCount, totalVoters, averageStance, agentStances };
}

export function buildDecisionPrompt(
  question: string,
  summary: string,
  tally: VoteTally
): { system: string; user: string } {
  const { forCount, againstCount, totalVoters, averageStance, agentStances } = tally;

  const outcomeLabel =
    forCount > againstCount ? "YES / FOR"
    : againstCount > forCount ? "NO / AGAINST"
    : "TIE (equal FOR and AGAINST)";

  const margin = Math.abs(forCount - againstCount);
  const tallyLines = agentStances
    .map((a) => `  • ${a.agentName}: stance ${a.stance}/6 (${a.stance >= 4 ? "FOR" : "AGAINST"})`)
    .join("\n");

  return {
    system: `You extract structured verdicts from Supreme Court debates. The VOTE TALLY below is the authoritative ground truth — your verdict MUST match it exactly. Do not contradict the vote count. Return precise JSON.`,
    user: `Question: "${question}"

━━━ AUTHORITATIVE VOTE TALLY (ground truth — overrides all else) ━━━
Outcome: ${outcomeLabel}
FOR (stance 4-6): ${forCount} / ${totalVoters} justices
AGAINST (stance 1-3): ${againstCount} / ${totalVoters} justices
Margin: ${margin} vote${margin !== 1 ? "s" : ""}
Average stance: ${averageStance.toFixed(1)} / 6.0

Individual final stances (what each justice voted in their last round):
${tallyLines}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Debate summary (context only — the tally above is ground truth):
${summary}

Agent IDs (use these exactly for keyArguments): ${agentStances.map((a) => a.agentId).join(", ")}

RULES — you must follow these:
1. The verdict MUST reflect the outcome: ${outcomeLabel}.
2. Confidence is based on the vote margin (${forCount} vs ${againstCount} out of ${totalVoters}).
3. Extract one key argument per agent from the summary.

Return JSON.`,
  };
}
