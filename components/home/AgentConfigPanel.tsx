"use client";

import { useState } from "react";
import { ChevronDown, Plus, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentSpec } from "@/lib/types";
import { AgentSpecRow } from "./AgentSpecRow";

interface AgentConfigPanelProps {
  specs: AgentSpec[];
  onChange: (specs: AgentSpec[]) => void;
}

export function AgentConfigPanel({ specs, onChange }: AgentConfigPanelProps) {
  const [open, setOpen] = useState(false);

  const addAgent = () => {
    onChange([...specs, { name: "", description: "" }]);
  };

  const updateSpec = (index: number, field: keyof AgentSpec, value: string) => {
    const updated = specs.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    onChange(updated);
  };

  const removeSpec = (index: number) => {
    onChange(specs.filter((_, i) => i !== index));
  };

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-900/50 hover:bg-gray-900 transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users size={15} />
          <span>Custom agents</span>
          {specs.length > 0 && (
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
              {specs.length}
            </span>
          )}
          <span className="text-gray-600 text-xs">
            {specs.length === 0 ? "— auto-generated if empty" : ""}
          </span>
        </div>
        <ChevronDown
          size={15}
          className={`text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3 bg-gray-950/50">
              {specs.map((spec, i) => (
                <AgentSpecRow
                  key={i}
                  spec={spec}
                  index={i}
                  onChange={updateSpec}
                  onRemove={removeSpec}
                />
              ))}
              <button
                onClick={addAgent}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                <Plus size={14} />
                Add agent
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
