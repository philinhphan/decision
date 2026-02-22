"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import type { Agent, Message } from "@/lib/types";
import type { UseTTS } from "@/hooks/useTTS";

interface MessageFeedProps {
  messages: Message[];
  agents: Agent[];
  tts: UseTTS;
  activeMessageId?: string;
  activeMessageIds?: Set<string>;
  activeSearchMessageId?: string;
}

export function MessageFeed({ messages, agents, tts, activeMessageId, activeMessageIds, activeSearchMessageId }: MessageFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, activeMessageId]);

  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  return (
    <div className="space-y-6">
      <AnimatePresence mode="popLayout">
        {messages.map((message) => {
          const agent = agentMap[message.agentId];
          if (!agent) return null;
          const isActive = activeMessageIds
            ? activeMessageIds.has(message.id)
            : message.id === activeMessageId;
          return (
            <MessageBubble
              key={message.id}
              message={message}
              agent={agent}
              tts={tts}
              isActive={isActive}
              isSearching={message.id === activeSearchMessageId}
            />
          );
        })}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
