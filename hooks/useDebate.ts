"use client";

import { useCallback, useRef, useState } from "react";
import type { Agent, AgentSpec, DebateState, Message, SSEEvent, UploadedFile } from "@/lib/types";

const initialState: DebateState = {
  question: "",
  agents: [],
  messages: [],
  status: "idle",
  currentRound: 0,
  totalRounds: 3,
  summary: "",
  decision: "",
  confidence: 0,
  keyArguments: [],
  activeSearchMessageId: undefined,
  activeAgentIds: new Set(),
  activeMessageIds: new Set(),
};

function applyEvent(state: DebateState, event: SSEEvent): DebateState {
  switch (event.type) {
    case "agents_ready":
      return { ...state, agents: event.agents, status: "searching" };

    case "search_start":
      return { ...state, status: "searching" };

    case "search_done":
      return { ...state, status: "debating" };

    case "round_start":
      return {
        ...state,
        currentRound: event.round,
        totalRounds: event.totalRounds,
      };

    case "agent_start": {
      const newMessage: Message = {
        id: event.messageId,
        agentId: event.agentId,
        content: "",
        round: state.currentRound,
        timestamp: Date.now(),
        voiceId: event.voiceId,
      };
      const newAgentIds = new Set(state.activeAgentIds);
      newAgentIds.add(event.agentId);
      const newMessageIds = new Set(state.activeMessageIds);
      newMessageIds.add(event.messageId);
      return {
        ...state,
        activeAgentId: event.agentId,
        activeMessageId: event.messageId,
        activeAgentIds: newAgentIds,
        activeMessageIds: newMessageIds,
        messages: [...state.messages, newMessage],
      };
    }

    case "agent_token": {
      const messages = state.messages.map((m) =>
        m.id === event.messageId ? { ...m, content: m.content + event.token } : m
      );
      return { ...state, messages };
    }

    case "agent_done": {
      // Update the message with stance, clean display content, and spoken content
      const updatedMessages = state.messages.map((m) => {
        if (m.id !== event.messageId) return m;
        // Strip any remaining stance tag from streamed content (display)
        const cleanContent = m.content.replace(/\[STANCE:\s*\d\]\s*/i, "").replace(/^\s*\([^)]{1,40}\)\s*/, "").trim();
        return { ...m, content: cleanContent, stance: event.stance, spokenContent: event.spokenContent };
      });
      const newAgentIds = new Set(state.activeAgentIds);
      newAgentIds.delete(event.agentId);
      const newMessageIds = new Set(state.activeMessageIds);
      newMessageIds.delete(event.messageId);
      return {
        ...state,
        messages: updatedMessages,
        activeAgentIds: newAgentIds,
        activeMessageIds: newMessageIds,
        // Legacy single-agent fields: clear only if this was the only active one
        activeAgentId: newAgentIds.size === 0 ? undefined : state.activeAgentId,
        activeMessageId: newMessageIds.size === 0 ? undefined : state.activeMessageId,
        activeSearchMessageId: undefined,
      };
    }

    case "agent_search_start":
      return { ...state, activeSearchMessageId: event.messageId };

    case "agent_search_done":
      return { ...state, activeSearchMessageId: undefined };

    case "summary_token":
      return { ...state, status: "summarizing", summary: state.summary + event.token };

    case "summary_done":
      return state;

    case "decision_ready":
      return {
        ...state,
        decision: event.decision,
        confidence: event.confidence,
        keyArguments: event.keyArguments,
        forCount: event.forCount,
        againstCount: event.againstCount,
        totalVoters: event.totalVoters,
      };

    case "done":
      return {
        ...state,
        status: "done",
        activeAgentId: undefined,
        activeAgentIds: new Set(),
        activeMessageIds: new Set(),
      };

    case "error":
      return { ...state, status: "error", error: event.message };

    default:
      return state;
  }
}

export function useDebate() {
  const [state, setState] = useState<DebateState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const startDebate = useCallback(
    async (question: string, agentSpecs?: AgentSpec[], uploadedFiles?: UploadedFile[], credit?: string) => {
      // Cancel any existing debate
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        ...initialState,
        question,
        status: "generating_agents",
      });

      // Build file context string
      const fileContext = uploadedFiles && uploadedFiles.length > 0
        ? uploadedFiles.map((f) => `--- ${f.name} ---\n${f.content}`).join("\n\n")
        : undefined;

      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (credit) headers["X-Debate-Credit"] = credit;
        const response = await fetch("/api/debate", {
          method: "POST",
          headers,
          body: JSON.stringify({ question, agents: agentSpecs, fileContext }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Unknown error" }));
          setState((prev) => ({
            ...prev,
            status: "error",
            error: err.error ?? "Request failed",
          }));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on SSE double-newline delimiter
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            try {
              const event: SSEEvent = JSON.parse(jsonStr);
              setState((prev) => applyEvent(prev, event));
            } catch {
              // Ignore malformed events
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          status: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    },
    []
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return { state, startDebate, reset };
}
