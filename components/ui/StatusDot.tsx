"use client";

interface StatusDotProps {
  active?: boolean;
  color?: string;
  size?: "sm" | "md";
}

export function StatusDot({ active, color = "bg-gray-400", size = "sm" }: StatusDotProps) {
  const sizeClass = size === "sm" ? "w-2 h-2" : "w-3 h-3";

  return (
    <span className="relative inline-flex">
      <span className={`${sizeClass} rounded-full ${color}`} />
      {active && (
        <span
          className={`absolute inset-0 ${sizeClass} rounded-full ${color} animate-ping opacity-75`}
        />
      )}
    </span>
  );
}
