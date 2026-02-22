"use client";

interface RoundIndicatorProps {
  currentRound: number;
  totalRounds: number;
  status: string;
}

export function RoundIndicator({ currentRound, totalRounds, status }: RoundIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalRounds }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i < currentRound
                ? "bg-white w-6"
                : i === currentRound - 1 && status === "debating"
                ? "bg-gray-400 w-6 animate-pulse"
                : "bg-gray-700 w-4"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-gray-500">
        {status === "debating" && currentRound > 0
          ? `Round ${currentRound} of ${totalRounds}`
          : status === "summarizing"
          ? "Summarizing…"
          : status === "done"
          ? "Complete"
          : ""}
      </span>
    </div>
  );
}
