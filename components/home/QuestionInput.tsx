"use client";

import { useRef, useEffect } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

interface QuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}

export function QuestionInput({ value, onChange, onSubmit, isLoading }: QuestionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!isLoading && value.trim()) onSubmit();
    }
  };

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          autoResize();
        }}
        onKeyDown={handleKeyDown}
        placeholder="Enter a question to debate…"
        rows={3}
        className="w-full resize-none bg-gray-900 border border-gray-700 rounded-xl px-4 py-4 pr-12 text-white placeholder-gray-500 focus:outline-none focus:border-gray-500 text-base leading-relaxed"
      />
      <button
        onClick={onSubmit}
        disabled={isLoading || !value.trim()}
        className="absolute right-3 bottom-3 p-2 rounded-lg bg-white text-black hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        aria-label="Start debate"
      >
        {isLoading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <ArrowRight size={16} />
        )}
      </button>
      <p className="mt-1.5 text-xs text-gray-600">⌘ + Enter to submit</p>
    </div>
  );
}
