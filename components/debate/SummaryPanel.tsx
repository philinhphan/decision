"use client";

import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { ConfidenceBar } from "@/components/ui/ConfidenceBar";

interface SummaryPanelProps {
  decision: string;
  confidence: number;
  summary: string;
}

export function SummaryPanel({
  decision,
  confidence,
  summary,
}: SummaryPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Verdict */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-500">
          <CheckCircle size={18} />
          <span className="text-xs font-medium uppercase tracking-[0.15em]">Verdict</span>
        </div>
        <p className="text-xl text-black font-medium leading-relaxed">{decision}</p>
        <ConfidenceBar value={confidence} />
      </div>

      {/* Summary */}
      {summary && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500 uppercase tracking-[0.15em] font-medium">
            Analysis
          </p>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
