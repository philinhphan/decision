"use client";

import { AgentCard } from "./AgentCard";
import type { Agent } from "@/lib/types";

interface AgentCardRowProps {
  agents: Agent[];
  activeAgentId?: string;
}

export function AgentCardRow({ agents, activeAgentId }: AgentCardRowProps) {
  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex gap-2 min-w-max sm:min-w-0 sm:grid sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} isActive={activeAgentId === agent.id} />
        ))}
      </div>
    </div>
  );
}
