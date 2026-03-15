import { cn } from "@/lib/utils";

export function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-bold tabular-nums rounded-full shadow-sm",
        size === "sm" ? "text-[11px] h-7 w-7" : "text-sm h-9 min-w-9 px-2",
        score >= 70 && "bg-emerald-500 text-white",
        score >= 50 && score < 70 && "bg-emerald-400/90 text-white",
        score >= 35 && score < 50 && "bg-amber-400 text-amber-900",
        score < 35 && "bg-gray-200 text-gray-500"
      )}
    >
      {score}
    </span>
  );
}
