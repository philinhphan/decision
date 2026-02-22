"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";
import { COLOR_CLASSES } from "@/lib/colors";
import type { Agent, KeyArgument } from "@/lib/types";

interface SummaryPanelProps {
  decision: string;
  confidence: number;
  keyArguments: KeyArgument[];
  summary: string;
  agents: Agent[];
}

export function SummaryPanel({
  decision,
  confidence,
  keyArguments,
  summary,
  agents,
}: SummaryPanelProps) {
  const agentMap = Object.fromEntries(agents.map((a) => [a.id, a]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Verdict */}
      <div className="rounded-2xl border border-gray-700 bg-gray-900 p-6 space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle size={18} />
          <span className="text-sm font-medium uppercase tracking-wider">Verdict</span>
        </div>
        <p className="text-xl text-white font-medium leading-relaxed">{decision}</p>
        <ConfidenceBar value={confidence} />
      </div>

      {/* Key Arguments */}
      {keyArguments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm text-gray-500 uppercase tracking-wider font-medium">
            Key Arguments
          </h3>
          <div className="space-y-2">
            {keyArguments.map((ka) => {
              const agent = agentMap[ka.agentId];
              if (!agent) return null;
              const colors = COLOR_CLASSES[agent.color] ?? COLOR_CLASSES.blue;
              return (
                <div
                  key={ka.agentId}
                  className="flex gap-3 p-3 rounded-lg border border-gray-800 bg-gray-900/50"
                >
                  <span className={`shrink-0 w-2 rounded-full ${colors.bg}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${colors.text} mb-1`}>
                      {agent.emoji} {agent.name}
                    </p>
                    <p className="text-sm text-gray-300 leading-snug">{ka.argument}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="space-y-3">
          <h3 className="text-sm text-gray-500 uppercase tracking-wider font-medium">
            Analysis
          </h3>
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5">
            <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
