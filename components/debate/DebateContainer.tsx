"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { AgentCardRow } from "./AgentCardRow";
import { MessageFeed } from "./MessageFeed";
import { RoundIndicator } from "./RoundIndicator";
import { SummaryPanel } from "./SummaryPanel";
import type { DebateState } from "@/lib/types";
import { useTTS } from "@/hooks/useTTS";

interface DebateContainerProps {
  state: DebateState;
  onReset: () => void;
}

export function DebateContainer({ state, onReset }: DebateContainerProps) {
  const tts = useTTS();
  const completedMessageIdsRef = useRef(new Set<string>());
  const {
    agents,
    messages,
    status,
    currentRound,
    totalRounds,
    activeAgentId,
    activeMessageId,
    activeAgentIds,
    activeMessageIds,
    activeSearchMessageId,
    decision,
    confidence,
    summary,
    question,
    forCount,
    againstCount,
    totalVoters,
  } = state;

  useEffect(() => {
    completedMessageIdsRef.current.clear();
    tts.stop();
    tts.controls.clearError();
  }, [question]);

  useEffect(() => {
    for (const message of messages) {
      if (!message.content?.trim()) continue;
      // Skip messages that are still being generated
      if (activeMessageIds.has(message.id)) continue;
      if (completedMessageIdsRef.current.has(message.id)) continue;

      completedMessageIdsRef.current.add(message.id);
      const agent = agents.find((a) => a.id === message.agentId);
      const voiceId = message.voiceId || agent?.voiceId || undefined;
      // Use spokenContent (with emotion cue) for TTS — display stays clean
      const ttsText = message.spokenContent || message.content;

      void tts.prefetch({ messageId: message.id, text: ttsText, voiceId });
      tts.enqueue({ messageId: message.id, text: ttsText, voiceId });
    }
  }, [activeMessageIds, agents, messages, tts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Question</p>
          <h2 className="text-lg text-white font-medium leading-snug">{question}</h2>
        </div>
        <button
          onClick={onReset}
          className="shrink-0 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← New question
        </button>
      </div>

      {/* TTS controls */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => tts.controls.setEnabled(!tts.controls.enabled)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            tts.controls.enabled
              ? "border-gray-700 text-gray-300 hover:border-gray-500"
              : "border-rose-800 text-rose-300 hover:border-rose-600"
          }`}
        >
          {tts.controls.enabled ? "Sound: On" : "Sound: Muted"}
        </button>
        <button
          type="button"
          onClick={() => tts.controls.setAutoplay(!tts.controls.autoplay)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            tts.controls.autoplay
              ? "border-emerald-700 text-emerald-300 hover:border-emerald-500"
              : "border-gray-700 text-gray-300 hover:border-gray-500"
          }`}
          title="Autoplay speaks new messages as they finish"
        >
          {tts.controls.autoplay ? "Autoplay: On" : "Autoplay: Off"}
        </button>
        {tts.nowPlayingMessageId && (
          <button
            type="button"
            onClick={() => tts.stop()}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-700 text-gray-300 hover:border-gray-500 transition-colors"
          >
            Stop
          </button>
        )}
        {tts.controls.lastError && (
          <p className="text-xs text-rose-400">
            {tts.controls.lastError}{" "}
            <button
              type="button"
              onClick={() => tts.controls.clearError()}
              className="underline text-rose-300 hover:text-rose-200"
            >
              Dismiss
            </button>
          </p>
        )}
        {/* Debug: log TTS state to console */}
        <button
          type="button"
          onClick={() => console.log("[TTS debug]", tts.debugInfo())}
          className="text-xs px-2 py-1 rounded border border-gray-800 text-gray-600 hover:text-gray-400 transition-colors"
          title="Log TTS state to browser console"
        >
          dbg
        </button>
      </div>

      {/* Web search indicator */}
      {status === "searching" && (
        <p className="text-xs text-gray-500 animate-pulse">Searching the web…</p>
      )}

      {/* Round progress */}
      {(status === "debating" || status === "summarizing" || status === "done") && (
        <RoundIndicator
          currentRound={currentRound}
          totalRounds={totalRounds}
          status={status}
        />
      )}

      {/* Agents */}
      {agents.length > 0 && (
        <AgentCardRow
          agents={agents}
          activeAgentId={activeAgentId}
          activeAgentIds={activeAgentIds}
          speakingAgentId={
            tts.nowPlayingMessageId
              ? (messages.find((m) => m.id === tts.nowPlayingMessageId)?.agentId ?? null)
              : null
          }
        />
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <MessageFeed
          messages={messages}
          agents={agents}
          tts={tts}
          activeMessageId={activeMessageId}
          activeMessageIds={activeMessageIds}
          activeSearchMessageId={activeSearchMessageId}
        />
      )}

      {/* Summary panel */}
      <AnimatePresence>
        {status === "done" && decision && (
          <SummaryPanel
            decision={decision}
            confidence={confidence}
            summary={summary}
            forCount={forCount}
            againstCount={againstCount}
            totalVoters={totalVoters}
          />
        )}
      </AnimatePresence>

      {/* Error */}
      {status === "error" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-rose-800 bg-rose-950/50 p-4"
        >
          <p className="text-rose-400 text-sm">{state.error ?? "An error occurred"}</p>
        </motion.div>
      )}
    </div>
  );
}
