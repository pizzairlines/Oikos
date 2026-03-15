import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono font-semibold tabular-nums",
        size === "sm" ? "text-[11px] px-1.5 py-0.5" : "text-sm px-2.5 py-1",
        score >= 60 && "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-50",
        score >= 35 && score < 60 && "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-50",
        score < 35 && "border-border bg-muted text-muted-foreground hover:bg-muted"
      )}
    >
      {score}
    </Badge>
  );
}
