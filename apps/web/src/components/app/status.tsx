import { CircleCheck, Dumbbell, Repeat, Sparkles, Target } from "lucide-react";
import type { ExerciseStatus, QueueKind } from "@/lib/api";
import { cn } from "@/lib/utils";

export const statusMeta: Record<ExerciseStatus, { label: string; dot: string; text: string; ring: string }> = {
  new: { label: "Not started", dot: "bg-muted-foreground/40", text: "text-muted-foreground", ring: "var(--border)" },
  learning: { label: "Learning", dot: "bg-info", text: "text-info", ring: "var(--info)" },
  struggling: { label: "Needs work", dot: "bg-danger", text: "text-danger", ring: "var(--danger)" },
  review: { label: "Review due", dot: "bg-warning", text: "text-warning", ring: "var(--warning)" },
  mastered: { label: "Mastered", dot: "bg-success", text: "text-success", ring: "var(--success)" },
};

export const queueMeta: Record<QueueKind, { label: string; icon: typeof Repeat; className: string; mode: "learn" | "review" | "challenge" }> = {
  review: { label: "Review", icon: Repeat, className: "bg-warning/15 text-warning", mode: "review" },
  challenge: { label: "Strengthen", icon: Dumbbell, className: "bg-danger/12 text-danger", mode: "challenge" },
  next: { label: "New", icon: Sparkles, className: "bg-primary/12 text-primary", mode: "learn" },
  continue: { label: "Keep going", icon: Target, className: "bg-info/12 text-info", mode: "learn" },
};

export function StatusDot({ status, className }: { status: ExerciseStatus; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", statusMeta[status].dot, className)} aria-label={statusMeta[status].label} />;
}

export function StatusBadge({ status }: { status: ExerciseStatus }) {
  const m = statusMeta[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium", m.text)}>
      {status === "mastered" ? <CircleCheck className="size-3.5" /> : <StatusDot status={status} className="size-2" />}
      {m.label}
    </span>
  );
}

/** Circular mastery gauge. */
export function MasteryRing({ value, size = 44, stroke = 4, color = "var(--primary)", children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, value)))}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[10px] font-semibold tabular-nums">{children ?? `${Math.round(value * 100)}`}</div>
    </div>
  );
}
