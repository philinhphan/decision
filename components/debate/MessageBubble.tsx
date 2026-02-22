"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { COLOR_CLASSES } from "@/lib/colors";
import type { Agent, Message } from "@/lib/types";
import type { UseTTS } from "@/hooks/useTTS";

interface MessageBubbleProps {
  message: Message;
  agent: Agent;
  tts: UseTTS;
  isActive: boolean;
  isSearching?: boolean;
}

function SearchingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
        className="inline-block"
      >
        🔍
      </motion.span>
      <span>Searching the web…</span>
    </div>
  );
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

export function MessageBubble({ message, agent, tts, isActive, isSearching }: MessageBubbleProps) {
  const colors = COLOR_CLASSES[agent.color] ?? COLOR_CLASSES.blue;
  const isSpeaking = message.id === tts.nowPlayingMessageId;
  const resolvedVoiceId = message.voiceId || agent.voiceId || undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-2"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-base shrink-0 bg-gray-800">
          {agent.imageUrl ? (
            <Image
              src={agent.imageUrl}
              alt={agent.name}
              width={28}
              height={28}
              className="w-full h-full object-cover object-top"
              unoptimized
            />
          ) : (
            agent.emoji
          )}
        </div>
        <span className={`text-sm font-medium ${colors.text}`}>{agent.name}</span>
        <span className="text-xs text-gray-600">{agent.role}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
          Round {message.round}
        </span>
        <button
          type="button"
          onClick={() => {
            if (isSpeaking) {
              tts.stop();
              return;
            }
            void tts.speakNow({
              messageId: message.id,
              text: message.content,
              voiceId: resolvedVoiceId,
            });
          }}
          disabled={!tts.controls.enabled || !message.content?.trim()}
          className="ml-auto text-xs text-gray-400 hover:text-gray-200 disabled:text-gray-600 transition-colors"
          aria-label="Speak message"
          title={!tts.controls.enabled ? "Muted" : resolvedVoiceId ? "Speak" : "Speak (default voice)"}
        >
          {isSpeaking ? "■ Stop" : "🔊 Speak"}
        </button>
      </div>
      <div
        className={`rounded-xl px-4 py-3 border ${
          isActive ? `border-gray-700 bg-gray-900` : "border-gray-800 bg-gray-900/50"
        }`}
      >
        {message.content ? (
          <>
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
              {message.content}
            </p>
            {isSearching && (
              <div className="mt-2 pt-2 border-t border-gray-700">
                <SearchingIndicator />
              </div>
            )}
          </>
        ) : isSearching ? (
          <SearchingIndicator />
        ) : (
          <TypingDots />
        )}
      </div>
    </motion.div>
  );
}
