"use client";

import { X } from "lucide-react";
import type { AgentSpec } from "@/lib/types";

interface AgentSpecRowProps {
  spec: AgentSpec;
  index: number;
  onChange: (index: number, field: keyof AgentSpec, value: string) => void;
  onRemove: (index: number) => void;
}

export function AgentSpecRow({ spec, index, onChange, onRemove }: AgentSpecRowProps) {
  return (
    <div className="flex gap-2 items-start">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          type="text"
          placeholder="Agent name"
          value={spec.name}
          onChange={(e) => onChange(index, "name", e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
        />
        <input
          type="text"
          placeholder="Role / perspective"
          value={spec.description}
          onChange={(e) => onChange(index, "description", e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
        />
        <input
          type="text"
          placeholder="ElevenLabs voice ID (optional)"
          value={spec.voiceId ?? ""}
          onChange={(e) => onChange(index, "voiceId", e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
        />
      </div>
      <button
        onClick={() => onRemove(index)}
        className="mt-2 text-gray-600 hover:text-gray-300 transition-colors"
        aria-label="Remove agent"
      >
        <X size={16} />
      </button>
    </div>
  );
}
