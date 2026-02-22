"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Agent, Message, StanceLevel } from "@/lib/types";

const LANES: { level: StanceLevel; label: string }[] = [
  { level: 1, label: "STRONGLY DISAGREE" },
  { level: 2, label: "DISAGREE" },
  { level: 3, label: "SOMEWHAT DISAGREE" },
  { level: 4, label: "SOMEWHAT AGREE" },
  { level: 5, label: "AGREE" },
  { level: 6, label: "STRONGLY AGREE" },
];

interface JusticeInfo {
  title?: string;
  appointed_by?: string;
  year_appointed?: number;
  political_lean?: string;
  judicial_philosophy?: string;
  education?: string;
  religion?: string;
  notable_opinions?: string[];
  personality_traits?: string[];
  background?: string;
}

interface SpectrumViewProps {
  agents: Agent[];
  messages: Message[];
  question: string;
  currentRound: number;
  activeAgentId?: string;
  activeAgentIds?: Set<string>;
  justiceInfo?: Record<string, JusticeInfo>;
}

// Info tooltip popup component
function InfoPopup({ info, name, onClose }: { info: JusticeInfo; name: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -6 }}
      transition={{ duration: 0.18 }}
      className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-50 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 text-left"
      style={{ minWidth: 280 }}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-700 text-xs rounded-full hover:bg-gray-100"
      >
        ✕
      </button>

      <p className="font-semibold text-sm text-black mb-0.5">{name}</p>
      {info.title && <p className="text-[11px] text-gray-500 mb-3">{info.title}</p>}

      {info.appointed_by && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Appointed by</p>
          <p className="text-xs text-gray-700">{info.appointed_by} ({info.year_appointed})</p>
        </div>
      )}
      {info.political_lean && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Political lean</p>
          <p className="text-xs text-gray-700">{info.political_lean}</p>
        </div>
      )}
      {info.judicial_philosophy && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Philosophy</p>
          <p className="text-xs text-gray-700">{info.judicial_philosophy}</p>
        </div>
      )}
      {info.education && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Education</p>
          <p className="text-xs text-gray-700">{info.education}</p>
        </div>
      )}
      {info.background && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Background</p>
          <p className="text-xs text-gray-700 leading-relaxed">{info.background}</p>
        </div>
      )}
      {info.notable_opinions && info.notable_opinions.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Notable Opinions</p>
          <ul className="space-y-0.5">
            {info.notable_opinions.slice(0, 3).map((op, i) => (
              <li key={i} className="text-xs text-gray-700 leading-relaxed">• {op}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tooltip tail pointing down */}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white" />
      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-px w-0 h-0 border-l-[9px] border-r-[9px] border-t-[9px] border-l-transparent border-r-transparent border-t-gray-200 -z-10" />
    </motion.div>
  );
}

// Individual agent node with lingering bubble logic
function AgentNode({
  agent,
  xPercent,
  xOffset,
  yOffset,
  isActive,
  message,
  justiceInfo,
}: {
  agent: Agent;
  xPercent: number;
  xOffset: number;
  yOffset: number;
  isActive: boolean;
  message: string | null;
  justiceInfo?: JusticeInfo;
}) {
  const LINGER_MS = 2200; // how long to keep bubble visible after agent stops being active

  // lingeringMessage holds the last message we should show
  const [lingeringMessage, setLingeringMessage] = useState<string | null>(null);
  const [showBubble, setShowBubble] = useState(false);
  const lingerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  // Whenever the agent becomes active with a message, latch it and show bubble
  useEffect(() => {
    if (isActive && message) {
      // Update the latched message continuously while streaming
      setLingeringMessage(message);
      setShowBubble(true);
      // Reset any pending linger timer
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current);
    }
  }, [isActive, message]);

  // When the agent stops being active, start the linger timer
  useEffect(() => {
    if (!isActive && showBubble) {
      lingerTimerRef.current = setTimeout(() => {
        setShowBubble(false);
        setLingeringMessage(null);
      }, LINGER_MS);
    }
    return () => {
      if (lingerTimerRef.current) clearTimeout(lingerTimerRef.current);
    };
  }, [isActive, showBubble]);

  const displayMessage = lingeringMessage;
  const truncated = displayMessage
    ? displayMessage.length > 140
      ? displayMessage.slice(0, 140) + "…"
      : displayMessage
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
        stiffness: 55,
        damping: 18,
        mass: 1.2,
      }}
      className="absolute flex flex-col items-center"
    >
      {/* Speech bubble */}
      <AnimatePresence>
        {showBubble && truncated && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="absolute bottom-full mb-2 w-60 p-3 rounded-xl text-xs leading-relaxed shadow-lg border bg-white text-black border-gray-200 z-20"
            style={{ minWidth: 200 }}
          >
            {truncated}
            {/* Tail */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info popup */}
      <AnimatePresence>
        {showInfo && justiceInfo && (
          <InfoPopup
            info={justiceInfo}
            name={agent.name}
            onClose={() => setShowInfo(false)}
          />
        )}
      </AnimatePresence>

      {/* Avatar */}
      <div className={`relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-xl shadow-md border-2 bg-white transition-all ${
        isActive ? "border-black ring-2 ring-black/20 scale-110" : "border-gray-200"
      }`}>
        {agent.imageUrl ? (
          <Image
            src={agent.imageUrl}
            alt={agent.name}
            width={48}
            height={48}
            className="w-full h-full object-cover object-top"
            unoptimized
          />
        ) : (
          <span>{agent.emoji}</span>
        )}

        {/* Info "i" button — shown on hover */}
        {justiceInfo && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
            className="absolute inset-0 flex items-end justify-end opacity-0 hover:opacity-100 transition-opacity"
            title="Justice info"
          >
            <span className="mb-0.5 mr-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[9px] font-bold flex items-center justify-center leading-none">
              i
            </span>
          </button>
        )}
      </div>

      <p className="text-xs mt-1 text-center font-medium text-black whitespace-nowrap">
        {agent.name.split(" ").pop()}
      </p>

      {/* Small "i" below the name as always-visible alternative */}
      {justiceInfo && (
        <button
          onClick={() => setShowInfo((v) => !v)}
          className="mt-0.5 w-3.5 h-3.5 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 text-[8px] font-bold flex items-center justify-center transition-colors"
          title="Justice info"
        >
          i
        </button>
      )}
    </motion.div>
  );
}

export function SpectrumView({ agents, messages, question, currentRound, activeAgentId, activeAgentIds, justiceInfo }: SpectrumViewProps) {
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
    const totalHeight = rows * 90;
    const startY = (420 - totalHeight) / 2 + 20;
    const yOffset = startY + row * 90;
    return { xOffset, yOffset };
  };

  return (
    <div className="w-full bg-white">
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

        {/* Spectrum track — taller to accommodate speech bubbles */}
        <div className="relative bg-gray-50 border border-gray-200 rounded-lg" style={{ height: 480 }}>
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

            const initialPos = getInitialPosition(agentIndex, agents.length);

            let xPercent = 50;
            let xOffset = initialPos.xOffset;
            let yOffset = initialPos.yOffset;

            if (hasStance) {
              xPercent = getLaneX(stance);
              const agentsWithSameStance = agents.filter(a => agentStances.get(a.id) === stance);
              const indexInLane = agentsWithSameStance.indexOf(agent);
              xOffset = indexInLane % 2 === 0 ? -22 : 22;
              yOffset = 80 + Math.floor(indexInLane / 2) * 85;
            }

            const isActive = activeAgentIds ? activeAgentIds.has(agent.id) : activeAgentId === agent.id;
            const currentMessage = agentMessages.get(agent.id) ?? null;
            const info = justiceInfo?.[agent.name];

            return (
              <AgentNode
                key={agent.id}
                agent={agent}
                xPercent={xPercent}
                xOffset={xOffset}
                yOffset={yOffset}
                isActive={isActive}
                message={currentMessage}
                justiceInfo={info}
              />
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
