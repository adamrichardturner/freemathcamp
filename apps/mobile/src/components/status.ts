import type { ExerciseStatus, PracticeMode, QueueKind } from "@/lib/api";
import type { Colors, Tone } from "@/lib/theme";
import type { SymbolName } from "./ui";

/** Statuses and queues as the web shows them (apps/web/src/components/app/status.tsx). */
export const statusMeta: Record<ExerciseStatus, { label: string; tone: Tone; ring: (c: Colors) => string }> = {
  new: { label: "Not started", tone: "muted", ring: (c) => c.border },
  learning: { label: "Learning", tone: "info", ring: (c) => c.info },
  struggling: { label: "Needs work", tone: "danger", ring: (c) => c.danger },
  review: { label: "Review due", tone: "warning", ring: (c) => c.warning },
  mastered: { label: "Mastered", tone: "success", ring: (c) => c.success },
};

export const queueMeta: Record<QueueKind, { label: string; icon: SymbolName; tone: Tone; mode: PracticeMode }> = {
  review: { label: "Review", icon: "arrow.trianglehead.2.clockwise", tone: "warning", mode: "review" },
  challenge: { label: "Strengthen", icon: "dumbbell.fill", tone: "danger", mode: "challenge" },
  next: { label: "New", icon: "sparkles", tone: "primary", mode: "learn" },
  continue: { label: "Keep going", icon: "target", tone: "info", mode: "learn" },
};

/** The curriculum names Lucide icons for units and article categories; these are their SF Symbol twins. */
const UNIT_SYMBOLS: Record<string, SymbolName> = {
  ArrowLeftRight: "arrow.left.arrow.right",
  Compass: "safari",
  FunctionSquare: "function",
  Hash: "number",
  Infinity: "infinity",
  ListOrdered: "list.number",
  Percent: "percent",
  PieChart: "chart.pie.fill",
  Rocket: "paperplane.fill",
  Scale: "scalemass.fill",
  Spline: "point.topleft.down.to.point.bottomright.curvepath",
  Superscript: "textformat.superscript",
  Triangle: "triangle",
  TrendingUp: "chart.line.uptrend.xyaxis",
  Variable: "x.squareroot",
};

export const unitSymbol = (lucide: string): SymbolName => UNIT_SYMBOLS[lucide] ?? "square.on.circle";
