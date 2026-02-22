"use client";

import { motion } from "framer-motion";
import { COLOR_CLASSES } from "@/lib/colors";
import { StatusDot } from "@/components/ui/StatusDot";
import type { Agent } from "@/lib/types";

interface AgentCardProps {
  agent: Agent;
  isActive: boolean;
}

export function AgentCard({ agent, isActive }: AgentCardProps) {
  const colors = COLOR_CLASSES[agent.color] ?? COLOR_CLASSES.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
        isActive ? `${colors.border} bg-gray-900` : "border-gray-800 bg-gray-900/30"
      }`}
    >
      <div className="relative">
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${colors.bg} bg-opacity-20`}
        >
          {agent.emoji}
        </div>
        {isActive && (
          <span className="absolute -top-0.5 -right-0.5">
            <StatusDot active color={colors.dot} size="sm" />
          </span>
        )}
      </div>
      <div className="text-center">
        <p className={`text-xs font-medium leading-tight ${isActive ? colors.text : "text-gray-400"}`}>
          {agent.name}
        </p>
        <p className="text-xs text-gray-600 leading-tight mt-0.5 line-clamp-1">{agent.role}</p>
      </div>
    </motion.div>
  );
}
