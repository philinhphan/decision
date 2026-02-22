"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { COLOR_CLASSES } from "@/lib/colors";
import { StatusDot } from "@/components/ui/StatusDot";
import type { Agent } from "@/lib/types";

interface AgentCardProps {
  agent: Agent;
  isActive: boolean;
  isSpeaking?: boolean;
}

export function AgentCard({ agent, isActive, isSpeaking }: AgentCardProps) {
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
        {/* Green halo when speaking */}
        {isSpeaking && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              boxShadow: "0 0 0 3px rgba(34,197,94,0.85), 0 0 12px 4px rgba(34,197,94,0.4)",
              borderRadius: "50%",
            }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <div
          className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-xl ${colors.bg} bg-opacity-20`}
        >
          {agent.imageUrl ? (
            <Image
              src={agent.imageUrl}
              alt={agent.name}
              width={40}
              height={40}
              className="w-full h-full object-cover object-top"
              unoptimized
            />
          ) : (
            agent.emoji
          )}
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
