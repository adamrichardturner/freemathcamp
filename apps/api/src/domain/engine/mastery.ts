import { clamp } from "../../utils/math";
import type { ItemSignal } from "./signals";

/**
 * Bayesian Knowledge Tracing: mastery is the probability the learner has
 * learned the skill. Each observation updates it with Bayes' rule, then a
 * learning-transition step models learning from the practice itself.
 */
export const BKT = {
  prior: 0.15,
  slip: 0.1,
  guess: { numeric: 0.04, choice: 0.25 },
  /** Chance of learning from one problem, by difficulty level. */
  transit: { 1: 0.08, 2: 0.12, 3: 0.18 },
} as const;

export interface MasteryUpdate {
  previous: number;
  signal: ItemSignal;
  level: 1 | 2 | 3;
  multipleChoice: boolean;
}

export const updateMastery = ({ previous, signal, level, multipleChoice }: MasteryUpdate): number => {
  const p = clamp(previous, 0.001, 0.999);
  const guess = multipleChoice ? BKT.guess.choice : BKT.guess.numeric;
  // Harder problems are both harder to guess and stronger evidence.
  const slip = BKT.slip * (level === 3 ? 1.3 : 1);
  const g = guess / level;

  let posterior: number;
  if (signal.cleanSolve || (signal.components.errors === 0 && signal.struggle < 0.5)) {
    const evidenceCorrect = (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * g);
    // A slow or hinted solve is weaker evidence: blend towards the prior.
    const strength = 1 - signal.struggle;
    posterior = p + strength * (evidenceCorrect - p);
  } else {
    const evidenceWrong = (p * slip) / (p * slip + (1 - p) * (1 - g));
    // Struggling then recovering is less damning than giving up.
    const severity = clamp(signal.struggle, 0.3, 1);
    posterior = p + severity * (evidenceWrong - p);
  }
  const learned = posterior + (1 - posterior) * BKT.transit[level] * (signal.cleanSolve ? 1 : 0.5);
  return clamp(learned, 0.001, 0.999);
};

/**
 * Memory fades. Retrievability follows an exponential forgetting curve whose
 * stability is the current review interval, so well-spaced skills fade slowly.
 */
export const retrievability = (elapsedDays: number, stabilityDays: number) =>
  Math.exp(-Math.max(0, elapsedDays) / Math.max(stabilityDays, 0.5));

/** Mastery adjusted for time since last practice — what we expect *today*. */
export const effectiveMastery = (mastery: number, elapsedDays: number, stabilityDays: number) =>
  mastery * (0.55 + 0.45 * retrievability(elapsedDays, stabilityDays));

export const MASTERED_THRESHOLD = 0.85;
export const STRUGGLING_THRESHOLD = 0.45;
