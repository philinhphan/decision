"use client";

import { motion } from "framer-motion";
import { COLOR_CLASSES } from "@/lib/colors";
import type { Agent, Message } from "@/lib/types";

interface MessageBubbleProps {
  message: Message;
  agent: Agent;
  isActive: boolean;
}

function TypingDots() {
  return (
    <div className="flex gap-1 items-center h-5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-gray-500"
          animate={{ y: [0, -4, 0] }}
          transition={{
            repeat: Infinity,
            duration: 0.6,
            delay: i * 0.15,
          }}
        />
      ))}
    </div>
  );
}

export function MessageBubble({ message, agent, isActive }: MessageBubbleProps) {
  const colors = COLOR_CLASSES[agent.color] ?? COLOR_CLASSES.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{agent.emoji}</span>
        <span className={`text-sm font-medium ${colors.text}`}>{agent.name}</span>
        <span className="text-xs text-gray-600">{agent.role}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
          Round {message.round}
        </span>
      </div>
      <div
        className={`rounded-xl px-4 py-3 border ${
          isActive ? `border-gray-700 bg-gray-900` : "border-gray-800 bg-gray-900/50"
        }`}
      >
        {message.content ? (
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
        ) : (
          <TypingDots />
        )}
      </div>
    </motion.div>
  );
}
