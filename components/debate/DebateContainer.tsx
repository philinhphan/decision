"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AgentCardRow } from "./AgentCardRow";
import { MessageFeed } from "./MessageFeed";
import { RoundIndicator } from "./RoundIndicator";
import { SummaryPanel } from "./SummaryPanel";
import type { DebateState } from "@/lib/types";

interface DebateContainerProps {
  state: DebateState;
  onReset: () => void;
}

export function DebateContainer({ state, onReset }: DebateContainerProps) {
  const {
    agents,
    messages,
    status,
    currentRound,
    totalRounds,
    activeAgentId,
    activeMessageId,
    activeSearchMessageId,
    decision,
    confidence,
    keyArguments,
    summary,
    question,
  } = state;

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
        <AgentCardRow agents={agents} activeAgentId={activeAgentId} />
      )}

      {/* Messages */}
      {messages.length > 0 && (
        <MessageFeed
          messages={messages}
          agents={agents}
          activeMessageId={activeMessageId}
          activeSearchMessageId={activeSearchMessageId}
        />
      )}

      {/* Summary panel */}
      <AnimatePresence>
        {status === "done" && decision && (
          <SummaryPanel
            decision={decision}
            confidence={confidence}
            keyArguments={keyArguments}
            summary={summary}
            agents={agents}
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
