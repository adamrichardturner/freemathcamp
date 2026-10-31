import { ancestors, unlockWeight, type CourseGraph } from "@fmc/curriculum";
import { mean, round } from "../../utils/math";
import { effectiveMastery, MASTERED_THRESHOLD, STRUGGLING_THRESHOLD } from "./mastery";

/** The subset of stored progress the recommender needs. */
export interface ProgressSnapshot {
  exerciseId: string;
  mastery: number;
  struggle: number;
  itemsSeen: number;
  sessionsCompleted: number;
  intervalDays: number;
  dueAt: Date | null;
  lastPracticedAt: Date | null;
}

export type QueueKind = "review" | "challenge" | "next" | "continue";

export interface Recommendation {
  exerciseId: string;
  kind: QueueKind;
  /** Higher is more urgent; comparable within a queue. */
  priority: number;
  reason: string;
  /** For challenges: weak prerequisites worth revisiting first. */
  brushUp?: string[];
  effectiveMastery: number;
}

export interface Queues {
  review: Recommendation[];
  challenge: Recommendation[];
  next: Recommendation[];
  continue: Recommendation[];
  /** A short, interleaved plan for today drawn from the queues above. */
  plan: Recommendation[];
}

const DAY = 86_400_000;

export const buildQueues = (graph: CourseGraph, progress: Map<string, ProgressSnapshot>, now: Date, limit = 8): Queues => {
  const titleOf = (id: string) => graph.byId.get(id)?.exercise.title ?? id;
  const eff = (p: ProgressSnapshot | undefined) => {
    if (!p || p.itemsSeen === 0) return 0;
    const elapsed = p.lastPracticedAt ? (now.getTime() - p.lastPracticedAt.getTime()) / DAY : 0;
    return effectiveMastery(p.mastery, elapsed, Math.max(p.intervalDays, 1));
  };
  const maxUnlock = Math.max(1, ...graph.refs.map((r) => unlockWeight(graph, r.exercise.id)));

  const review: Recommendation[] = [];
  const challenge: Recommendation[] = [];
  const next: Recommendation[] = [];
  const cont: Recommendation[] = [];

  for (const ref of graph.refs) {
    const id = ref.exercise.id;
    const p = progress.get(id);
    const e = eff(p);
    const started = !!p && p.itemsSeen > 0;

    if (!started) {
      const prereqs = ref.exercise.prerequisites;
      const readiness = prereqs.length === 0 ? 1 : mean(prereqs.map((pre) => eff(progress.get(pre))));
      const unlock = unlockWeight(graph, id) / maxUnlock;
      const orderBias = 1 - ref.order / graph.refs.length;
      const priority = 2 * readiness + 0.6 * unlock + 1.2 * orderBias;
      const strongest = prereqs.filter((pre) => eff(progress.get(pre)) >= 0.7).map(titleOf);
      const reason =
        prereqs.length === 0
          ? "A great starting point — no prerequisites"
          : strongest.length > 0
            ? `Builds on ${strongest.slice(0, 2).join(" & ")}, which you know well`
            : readiness > 0
              ? "You've started the ideas this builds on"
              : `Next in the course · unlocks ${unlockWeight(graph, id)} later lessons`;
      next.push({ exerciseId: id, kind: "next", priority, reason, effectiveMastery: 0 });
      continue;
    }

    const isStruggling = p.struggle >= STRUGGLING_THRESHOLD || (p.mastery < 0.5 && p.itemsSeen >= 4);
    if (isStruggling) {
      const brushUp = ancestors(graph, id)
        .filter((pre) => eff(progress.get(pre)) < 0.7)
        .slice(0, 3);
      challenge.push({
        exerciseId: id,
        kind: "challenge",
        priority: p.struggle * 2 + (1 - p.mastery),
        reason: `You've found this tricky (struggle ${Math.round(p.struggle * 100)}%) — let's rebuild it step by step`,
        brushUp,
        effectiveMastery: round(e),
      });
    }

    const dueIn = p.dueAt ? p.dueAt.getTime() - now.getTime() : Infinity;
    if (p.sessionsCompleted > 0 && dueIn <= 12 * 3_600_000) {
      const overdueDays = -dueIn / DAY;
      review.push({
        exerciseId: id,
        kind: "review",
        priority: overdueDays / Math.max(p.intervalDays, 1) + (1 - e),
        reason: overdueDays > 1 ? `Overdue by ${Math.floor(overdueDays)} day${overdueDays >= 2 ? "s" : ""} — memory is fading` : "Due for review today",
        effectiveMastery: round(e),
      });
    } else if (p.mastery < MASTERED_THRESHOLD && !isStruggling) {
      cont.push({
        exerciseId: id,
        kind: "continue",
        priority: p.mastery + (p.lastPracticedAt ? -((now.getTime() - p.lastPracticedAt.getTime()) / DAY) * 0.01 : 0),
        reason: `${Math.round(p.mastery * 100)}% mastered — a little more practice will lock it in`,
        effectiveMastery: round(e),
      });
    }
  }

  const byPriority = (a: Recommendation, b: Recommendation) => b.priority - a.priority;
  review.sort(byPriority);
  challenge.sort(byPriority);
  next.sort(byPriority);
  cont.sort(byPriority);

  const plan = interleave([review.slice(0, 2), challenge.slice(0, 1), cont.slice(0, 1), next.slice(0, 2)], 5);

  return {
    review: review.slice(0, limit),
    challenge: challenge.slice(0, limit),
    next: next.slice(0, limit),
    continue: cont.slice(0, limit),
    plan,
  };
};

/** Round-robin across queues so the plan mixes review, repair and new material. */
const interleave = (lists: Recommendation[][], max: number) => {
  const out: Recommendation[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < max && lists.some((l) => l.length > i); i++)
    for (const list of lists) {
      const item = list[i];
      if (item && !seen.has(item.exerciseId) && out.length < max) {
        out.push(item);
        seen.add(item.exerciseId);
      }
    }
  return out;
};
