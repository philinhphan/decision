export const COLOR_CLASSES: Record<
  string,
  { bg: string; text: string; border: string; dot: string; pill: string; badge: string }
> = {
  blue: {
    bg: "bg-blue-500",
    text: "text-blue-400",
    border: "border-blue-500",
    dot: "bg-blue-400",
    pill: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    badge: "bg-blue-500/10 text-blue-300",
  },
  emerald: {
    bg: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-500",
    dot: "bg-emerald-400",
    pill: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    badge: "bg-emerald-500/10 text-emerald-300",
  },
  violet: {
    bg: "bg-violet-500",
    text: "text-violet-400",
    border: "border-violet-500",
    dot: "bg-violet-400",
    pill: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
    badge: "bg-violet-500/10 text-violet-300",
  },
  amber: {
    bg: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500",
    dot: "bg-amber-400",
    pill: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    badge: "bg-amber-500/10 text-amber-300",
  },
  rose: {
    bg: "bg-rose-500",
    text: "text-rose-400",
    border: "border-rose-500",
    dot: "bg-rose-400",
    pill: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    badge: "bg-rose-500/10 text-rose-300",
  },
  cyan: {
    bg: "bg-cyan-500",
    text: "text-cyan-400",
    border: "border-cyan-500",
    dot: "bg-cyan-400",
    pill: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
    badge: "bg-cyan-500/10 text-cyan-300",
  },
  orange: {
    bg: "bg-orange-500",
    text: "text-orange-400",
    border: "border-orange-500",
    dot: "bg-orange-400",
    pill: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    badge: "bg-orange-500/10 text-orange-300",
  },
  teal: {
    bg: "bg-teal-500",
    text: "text-teal-400",
    border: "border-teal-500",
    dot: "bg-teal-400",
    pill: "bg-teal-500/20 text-teal-300 border border-teal-500/30",
    badge: "bg-teal-500/10 text-teal-300",
  },
  indigo: {
    bg: "bg-indigo-500",
    text: "text-indigo-400",
    border: "border-indigo-500",
    dot: "bg-indigo-400",
    pill: "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30",
    badge: "bg-indigo-500/10 text-indigo-300",
  },
  pink: {
    bg: "bg-pink-500",
    text: "text-pink-400",
    border: "border-pink-500",
    dot: "bg-pink-400",
    pill: "bg-pink-500/20 text-pink-300 border border-pink-500/30",
    badge: "bg-pink-500/10 text-pink-300",
  },
};

export const COLOR_NAMES = Object.keys(COLOR_CLASSES);

export function getColorForIndex(index: number): string {
  return COLOR_NAMES[index % COLOR_NAMES.length];
}
