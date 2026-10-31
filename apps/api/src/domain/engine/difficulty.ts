import type { ItemSignal } from "./signals";

export type Level = 1 | 2 | 3;
export type PracticeMode = "learn" | "review" | "challenge";

export const ITEMS_PER_SESSION: Record<PracticeMode, number> = { learn: 6, review: 5, challenge: 8 };

/** Starting level from current mastery; challenges always start gently. */
export const startingLevel = (mastery: number, mode: PracticeMode): Level => {
  if (mode === "challenge") return 1;
  if (mastery < 0.35) return 1;
  if (mastery < 0.7) return 2;
  return 3;
};

/**
 * Within-session adaptation (a small staircase): two clean solves in a row step
 * up, a heavy struggle steps down, so each learner settles where they are
 * challenged but not stuck.
 */
export const nextLevel = (current: Level, recent: ItemSignal[]): Level => {
  const last = recent[recent.length - 1];
  const prev = recent[recent.length - 2];
  if (!last) return current;
  if (last.struggle >= 0.6) return Math.max(1, current - 1) as Level;
  if (last.cleanSolve && last.struggle < 0.25 && prev?.cleanSolve) return Math.min(3, current + 1) as Level;
  return current;
};
