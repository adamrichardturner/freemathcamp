import { clamp } from "../../utils/math";

/**
 * Everything the engine knows about one resolved problem. A problem is resolved
 * when the learner answers correctly or gives up and reveals the solution.
 */
export interface ItemOutcome {
  wrongAttempts: number;
  revealed: boolean;
  hintsUsed: number;
  timeMs: number;
  /** Confident-learner baseline for this exercise. */
  expectedSeconds: number;
  level: 1 | 2 | 3;
}

/** Tunable weights, kept together so the model can be calibrated in one place. */
export const STRUGGLE_WEIGHTS = {
  /** Each wrong attempt halves the remaining "no struggle" headroom: 0, .5, .75, .875… */
  wrongDecay: 0.5,
  hintPenalty: 0.15,
  maxHintPenalty: 0.3,
  /** Penalty reached when time is 4× the expected time (log2 ratio of 2). */
  maxTimePenalty: 0.4,
} as const;

export interface ItemSignal {
  /** 0 = effortless, 1 = could not solve. */
  struggle: number;
  /** Component scores, kept for analytics and explanations. */
  components: { errors: number; hints: number; time: number };
  /** True when the first submitted answer was right and unaided. */
  cleanSolve: boolean;
}

/**
 * Converts raw behaviour into a struggle score. Components combine like
 * independent probabilities so no single factor can push the score past 1,
 * and errors weigh most, then time, then hints.
 */
export const itemSignal = (o: ItemOutcome): ItemSignal => {
  const W = STRUGGLE_WEIGHTS;
  const errors = o.revealed ? 1 : 1 - W.wrongDecay ** o.wrongAttempts;
  const hints = Math.min(W.maxHintPenalty, o.hintsUsed * W.hintPenalty);
  // Harder levels get proportionally more time before being penalised.
  const expectedMs = o.expectedSeconds * 1000 * (1 + (o.level - 1) * 0.35);
  const ratio = Math.max(o.timeMs, 1) / expectedMs;
  const time = W.maxTimePenalty * clamp(Math.log2(ratio) / 2, 0, 1);
  const struggle = 1 - (1 - errors) * (1 - hints) * (1 - time);
  return {
    struggle: clamp(struggle, 0, 1),
    components: { errors, hints, time },
    cleanSolve: !o.revealed && o.wrongAttempts === 0 && o.hintsUsed === 0,
  };
};

/**
 * Exponentially weighted struggle across items. Early items get a larger
 * weight (1/n) so a brand-new exercise isn't anchored to the initial 0.
 */
export const updateStruggle = (previous: number, itemsSeen: number, signal: number, alpha = 0.3) => {
  const weight = Math.max(alpha, 1 / (itemsSeen + 1));
  return clamp(previous + weight * (signal - previous), 0, 1);
};
