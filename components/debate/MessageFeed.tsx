"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { MessageBubble } from "./MessageBubble";
import type { Agent, Message } from "@/lib/types";

interface MessageFeedProps {
  messages: Message[];
  agents: Agent[];
  activeMessageId?: string;
  activeSearchMessageId?: string;
}

export function MessageFeed({ messages, agents, activeMessageId, activeSearchMessageId }: MessageFeedProps) {
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
          return (
            <MessageBubble
              key={message.id}
              message={message}
              agent={agent}
              isActive={message.id === activeMessageId}
              isSearching={message.id === activeSearchMessageId}
            />
          );
        })}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
