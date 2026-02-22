"use client";

import { motion } from "framer-motion";

interface ConfidenceBarProps {
  value: number; // 0-100
}

function getConfidenceLabel(value: number): { label: string; color: string } {
  if (value >= 80) return { label: "High Confidence", color: "bg-emerald-500" };
  if (value >= 60) return { label: "Moderate Confidence", color: "bg-amber-500" };
  if (value >= 40) return { label: "Low Confidence", color: "bg-orange-500" };
  return { label: "Very Low Confidence", color: "bg-rose-500" };
}

export function ConfidenceBar({ value }: ConfidenceBarProps) {
  const { label, color } = getConfidenceLabel(value);

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-500">{label}</span>
        <span className="text-black font-semibold">{value}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
        />
      </div>
    </div>
  );
}
