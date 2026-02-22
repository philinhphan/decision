"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Scale } from "lucide-react";
import { useDebate } from "@/hooks/useDebate";
import { QuestionInput } from "@/components/home/QuestionInput";
import { AgentConfigPanel } from "@/components/home/AgentConfigPanel";
import { ExampleQuestions } from "@/components/home/ExampleQuestions";
import { DebateContainer } from "@/components/debate/DebateContainer";
import type { AgentSpec } from "@/lib/types";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [agentSpecs, setAgentSpecs] = useState<AgentSpec[]>([]);
  const { state, startDebate, reset } = useDebate();

  const isActive = state.status !== "idle" && state.status !== "error";
  const isLoading = state.status === "generating_agents";

  const handleSubmit = () => {
    if (!question.trim() || isLoading) return;
    const validSpecs = agentSpecs.filter((s) => s.name.trim());
    startDebate(question.trim(), validSpecs.length > 0 ? validSpecs : undefined);
  };

  const handleReset = () => {
    reset();
    setQuestion("");
  };

  const handleExampleSelect = (q: string) => {
    setQuestion(q);
    setAgentSpecs([]);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
        {/* Hero header */}
        <AnimatePresence mode="wait">
          {!isActive && (
            <motion.div
              key="hero"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center mb-10"
            >
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                  <Scale size={24} className="text-white" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-white">
                  Decision Engine
                </h1>
              </div>
              <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                Multi-agent AI debates for complex questions. Auto-assembles expert panels, runs
                3 rounds of structured debate, and delivers a verdict.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input section or debate container */}
        <AnimatePresence mode="wait">
          {!isActive ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <QuestionInput
                value={question}
                onChange={setQuestion}
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
              <AgentConfigPanel specs={agentSpecs} onChange={setAgentSpecs} />
              <ExampleQuestions onSelect={handleExampleSelect} />
            </motion.div>
          ) : (
            <motion.div
              key="debate"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <DebateContainer state={state} onReset={handleReset} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
