"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Agent, Message, StanceLevel } from "@/lib/types";

const LANES: { level: StanceLevel; label: string }[] = [
  { level: 1, label: "STRONGLY DISAGREE" },
  { level: 2, label: "DISAGREE" },
  { level: 3, label: "SOMEWHAT DISAGREE" },
  { level: 4, label: "SOMEWHAT AGREE" },
  { level: 5, label: "AGREE" },
  { level: 6, label: "STRONGLY AGREE" },
];

interface SpectrumViewProps {
  agents: Agent[];
  messages: Message[];
  question: string;
  currentRound: number;
  activeAgentId?: string;
}

export function SpectrumView({ agents, messages, question, currentRound, activeAgentId }: SpectrumViewProps) {
  // Get the latest stance and message for each agent
  const agentStances = new Map<string, StanceLevel>();
  const agentMessages = new Map<string, string>();

  for (const msg of messages) {
    if (msg.stance) {
      agentStances.set(msg.agentId, msg.stance);
    }
    if (msg.content) {
      agentMessages.set(msg.agentId, msg.content);
    }
  }

  // Calculate x position - center of each lane (6 lanes total)
  const getLaneX = (stance: StanceLevel) => {
    return ((stance - 0.5) / 6) * 100;
  };

  // Calculate initial grid position for an agent (before they have a stance)
  const getInitialPosition = (agentIndex: number, totalAgents: number) => {
    const cols = Math.min(Math.ceil(Math.sqrt(totalAgents)), 4);
    const rows = Math.ceil(totalAgents / cols);
    const row = Math.floor(agentIndex / cols);
    const col = agentIndex % cols;
    const itemsInThisRow = Math.min(cols, totalAgents - row * cols);
    const rowStartOffset = -(itemsInThisRow - 1) / 2;
    const xOffset = (rowStartOffset + col) * 70;
    const totalHeight = rows * 75;
    const startY = (300 - totalHeight) / 2 + 20;
    const yOffset = startY + row * 75;
    return { xOffset, yOffset };
  };

  return (
    <div className="w-full bg-white min-h-[500px]">
      {/* Question header */}
      <div className="text-center py-8 border-b border-gray-200">
        <p className="text-xs tracking-[0.2em] text-gray-400 mb-2">QUESTION</p>
        <p className="text-xl text-black font-medium max-w-2xl mx-auto px-4">{question}</p>
        {currentRound > 0 && (
          <p className="text-xs text-gray-400 mt-3">Round {currentRound} of 3</p>
        )}
      </div>

      {/* Spectrum visualization */}
      <div className="relative px-8 py-12">
        {/* Lane labels at top */}
        <div className="flex justify-between mb-8 px-4">
          {LANES.map((lane) => (
            <div key={lane.level} className="flex-1 text-center">
              <p className="text-[10px] tracking-wider text-gray-400 uppercase">
                {lane.label}
              </p>
            </div>
          ))}
        </div>

        {/* Spectrum track */}
        <div className="relative h-[300px] bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
          {/* Vertical lane dividers */}
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-px bg-gray-200"
              style={{ left: `${(i / 6) * 100}%` }}
            />
          ))}

          {/* Center line (neutral) */}
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300" />

          {/* All agents */}
          {agents.map((agent, agentIndex) => {
            const stance = agentStances.get(agent.id);
            const hasStance = stance !== undefined;

            // Get initial centered position
            const initialPos = getInitialPosition(agentIndex, agents.length);

            // Calculate final position based on stance
            let xPercent = 50;
            let xOffset = initialPos.xOffset;
            let yOffset = initialPos.yOffset;

            if (hasStance) {
              xPercent = getLaneX(stance);
              const agentsWithSameStance = agents.filter(a => agentStances.get(a.id) === stance);
              const indexInLane = agentsWithSameStance.indexOf(agent);
              xOffset = indexInLane % 2 === 0 ? -20 : 20;
              yOffset = 60 + Math.floor(indexInLane / 2) * 70;
            }

            const isActive = activeAgentId === agent.id;
            // Only show message for the currently active agent
            const currentMessage = isActive ? agentMessages.get(agent.id) : null;
            const truncatedMessage = currentMessage
              ? (currentMessage.length > 100 ? currentMessage.slice(0, 100) + "..." : currentMessage)
              : null;

            return (
              <motion.div
                key={agent.id}
                initial={false}
                animate={{
                  left: `${xPercent}%`,
                  top: yOffset,
                  x: `calc(-50% + ${xOffset}px)`,
                }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 20,
                }}
                className="absolute flex flex-col items-center"
              >
                {/* Speech bubble - only for active agent */}
                <AnimatePresence>
                  {isActive && truncatedMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-full mb-2 w-52 p-3 rounded-xl text-xs leading-relaxed shadow-lg border bg-white text-black border-gray-200 z-20"
                    >
                      {truncatedMessage}
                      {/* Speech bubble tail */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-md border-2 bg-white transition-all ${
                  isActive ? "border-black ring-2 ring-black/20 scale-110" : "border-gray-200"
                }`}>
                  {agent.emoji}
                </div>
                <p className="text-xs mt-1 text-center font-medium text-black">
                  {agent.name.split(" ").pop()}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* Legend at bottom */}
        <div className="flex justify-between mt-4 px-4 text-xs text-gray-400">
          <span>← Disagree</span>
          <span>Agree →</span>
        </div>
      </div>
    </div>
  );
}
