export interface Agent {
  id: string;
  name: string;
  role: string;
  perspective: string;
  color: string;
  emoji: string;
}

export interface AgentSpec {
  name: string;
  description: string;
}

export interface Message {
  id: string;
  agentId: string;
  content: string;
  round: number;
  timestamp: number;
}

export type DebateStatus =
  | "idle"
  | "generating_agents"
  | "debating"
  | "summarizing"
  | "done"
  | "error";

export interface DebateState {
  question: string;
  agents: Agent[];
  messages: Message[];
  status: DebateStatus;
  currentRound: number;
  totalRounds: number;
  summary: string;
  decision: string;
  confidence: number;
  keyArguments: KeyArgument[];
  error?: string;
  activeAgentId?: string;
  activeMessageId?: string;
}

export interface KeyArgument {
  agentId: string;
  argument: string;
}

// SSE event types
export type SSEEvent =
  | { type: "agents_ready"; agents: Agent[] }
  | { type: "round_start"; round: number; totalRounds: number }
  | { type: "agent_start"; agentId: string; messageId: string }
  | { type: "agent_token"; agentId: string; messageId: string; token: string }
  | { type: "agent_done"; agentId: string; messageId: string }
  | { type: "summary_token"; token: string }
  | { type: "summary_done" }
  | { type: "decision_ready"; decision: string; confidence: number; keyArguments: KeyArgument[] }
  | { type: "done" }
  | { type: "error"; message: string };
