"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Loader2, RotateCcw, Plus, X, Edit2, Check } from "lucide-react";
import { useDebate } from "@/hooks/useDebate";
import { SpectrumView } from "@/components/debate/SpectrumView";
import { SummaryPanel } from "@/components/debate/SummaryPanel";
import { FileUploadZone } from "@/components/home/FileUploadZone";
import { SUPREME_COURT_JUSTICES } from "@/lib/presets";
import type { AgentSpec, UploadedFile } from "@/lib/types";

export default function Home() {
  const [question, setQuestion] = useState("");
  const [agentSpecs, setAgentSpecs] = useState<AgentSpec[]>(SUPREME_COURT_JUSTICES);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { state, startDebate, reset } = useDebate();

  const isActive = state.status !== "idle" && state.status !== "error";
  const isLoading = state.status === "generating_agents";

  const handleSubmit = () => {
    if (!question.trim() || isLoading || agentSpecs.length === 0) return;
    startDebate(question.trim(), agentSpecs, uploadedFiles);
  };

  const handleReset = () => {
    reset();
    setQuestion("");
    setUploadedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const addAgent = () => {
    setAgentSpecs([...agentSpecs, { name: "", description: "" }]);
    setEditingIndex(agentSpecs.length);
  };

  const removeAgent = (index: number) => {
    setAgentSpecs(agentSpecs.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
  };

  const updateAgent = (index: number, field: keyof AgentSpec, value: string) => {
    setAgentSpecs(agentSpecs.map((a, i) => (i === index ? { ...a, [field]: value } : a)));
  };

  return (
    <div className="min-h-screen bg-white text-black">
      <AnimatePresence mode="wait">
        {!isActive ? (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-screen flex flex-col"
          >
            {/* Header */}
            <header className="pt-16 pb-8 text-center border-b border-gray-200">
              <h1 className="text-2xl md:text-3xl tracking-[0.2em] font-medium">
                SUPREME CODE
              </h1>
              <p className="mt-2 text-xs tracking-[0.2em] text-gray-500">
                MULTI-AGENT DELIBERATION SYSTEM
              </p>
            </header>

            {/* Main content */}
            <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
              {/* Question input - moved to top */}
              <div className="space-y-4 mb-12">
                <p className="text-center text-xs tracking-[0.2em] text-gray-500">
                  QUESTION PRESENTED
                </p>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="State the question for deliberation..."
                  rows={3}
                  className="w-full resize-none bg-white border border-gray-300 rounded px-4 py-3 text-black placeholder-gray-400 focus:outline-none focus:border-gray-500 text-base leading-relaxed"
                  autoFocus
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">⌘ + Enter to submit</p>
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || !question.trim() || agentSpecs.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-black text-white text-sm tracking-wide hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Convening...
                      </>
                    ) : (
                      <>
                        Begin Deliberation
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2 mb-8">
                <p className="text-center text-xs tracking-[0.2em] text-gray-500">
                  EVIDENCE & DOCUMENTS
                </p>
                <FileUploadZone
                  files={uploadedFiles}
                  onFilesChange={setUploadedFiles}
                  disabled={isActive}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-8" />

              {/* Editable Court Panel */}
              <div className="mb-8">
                <p className="text-center text-xs tracking-[0.2em] text-gray-500 mb-6">
                  THE COURT
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {agentSpecs.map((agent, i) => (
                    <div
                      key={i}
                      className="group relative py-3 px-2 border border-gray-200 rounded bg-gray-50 hover:border-gray-400 transition-colors"
                    >
                      {editingIndex === i ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={agent.name}
                            onChange={(e) => updateAgent(i, "name", e.target.value)}
                            placeholder="Name"
                            className="w-full text-sm font-medium text-black bg-transparent border-b border-gray-300 focus:outline-none focus:border-gray-500 pb-1"
                            autoFocus
                          />
                          <input
                            type="text"
                            value={agent.description}
                            onChange={(e) => updateAgent(i, "description", e.target.value)}
                            placeholder="Role/perspective"
                            className="w-full text-xs text-gray-500 bg-transparent border-b border-gray-300 focus:outline-none focus:border-gray-500 pb-1"
                          />
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="absolute top-1 right-1 p-1 text-gray-400 hover:text-gray-600"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-black text-center">
                            {agent.name.split(" ").pop() || "Unnamed"}
                          </p>
                          {i === 0 && agentSpecs.length === 9 && (
                            <p className="text-xs text-gray-500 mt-0.5 text-center">C. J.</p>
                          )}
                          {agent.description && (
                            <p className="text-[10px] text-gray-400 mt-1 text-center truncate">
                              {agent.description}
                            </p>
                          )}
                          {/* Edit/Remove buttons */}
                          <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
                            <button
                              onClick={() => setEditingIndex(i)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              onClick={() => removeAgent(i)}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {/* Add agent button */}
                  <button
                    onClick={addAgent}
                    className="py-3 px-2 border border-dashed border-gray-300 rounded hover:border-gray-400 hover:bg-gray-100 transition-colors flex items-center justify-center gap-1 text-gray-400 hover:text-gray-600"
                  >
                    <Plus size={14} />
                    <span className="text-xs">Add</span>
                  </button>
                </div>
                <p className="text-center text-[10px] text-gray-400 mt-3">
                  Click to edit · Hover to remove · {agentSpecs.length} agent{agentSpecs.length !== 1 ? "s" : ""}
                </p>
              </div>
            </main>

            {/* Footer */}
            <footer className="py-6 text-center border-t border-gray-200">
              <p className="text-xs text-gray-400">
                Powered by multi-agent AI deliberation
              </p>
            </footer>
          </motion.div>
        ) : (
          <motion.div
            key="debate"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen bg-white"
          >
            {/* Header during debate */}
            <div className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-200">
              <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                <h1 className="text-sm tracking-[0.15em] text-gray-500">SUPREME CODE</h1>
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-black transition-colors"
                >
                  <RotateCcw size={14} />
                  New Question
                </button>
              </div>
            </div>

            {/* Spectrum View */}
            <div className="max-w-5xl mx-auto px-4 py-8">
              <SpectrumView
                agents={state.agents}
                messages={state.messages}
                question={state.question}
                currentRound={state.currentRound}
                activeAgentId={state.activeAgentId}
              />

              {/* Summary Panel when done - moved above deliberation */}
              {state.status === "done" && state.decision && (
                <div className="mt-8">
                  <SummaryPanel
                    decision={state.decision}
                    confidence={state.confidence}
                    summary={state.summary}
                  />
                </div>
              )}

              {/* Conversation Feed */}
              {state.messages.length > 0 && (
                <div className="mt-8 border-t border-gray-200 pt-8">
                  <p className="text-xs tracking-[0.2em] text-gray-400 mb-6 text-center">DELIBERATION</p>
                  <div className="space-y-4 max-w-2xl mx-auto">
                    {state.messages.map((msg) => {
                      const agent = state.agents.find((a) => a.id === msg.agentId);
                      if (!agent || !msg.content) return null;
                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex gap-3"
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm bg-gray-100 border border-gray-200 shrink-0">
                            {agent.emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                              <span className="text-sm font-medium text-black">
                                {agent.name.split(" ").pop()}
                              </span>
                              <span className="text-xs text-gray-400">Round {msg.round}</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{msg.content}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Loading states */}
              {state.status === "summarizing" && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-gray-500">Synthesizing verdict...</p>
                  <p className="text-gray-600 mt-4 max-w-xl mx-auto text-sm leading-relaxed">
                    {state.summary}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
