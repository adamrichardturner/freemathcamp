import { clamp } from "../../utils/math";

/**
 * Spaced repetition in the style of SM-2. Each completed session is graded
 * 0–5 from accuracy and struggle; good sessions stretch the interval by the
 * ease factor, poor sessions reset it to a day.
 */
export interface ScheduleState {
  ease: number;
  intervalDays: number;
  reviewCount: number;
}

export const INITIAL_SCHEDULE: ScheduleState = { ease: 2.5, intervalDays: 0, reviewCount: 0 };

export const sessionQuality = (firstTryAccuracy: number, meanStruggle: number) =>
  Math.round(clamp(5 * (0.6 * firstTryAccuracy + 0.4 * (1 - meanStruggle)), 0, 5));

export const nextSchedule = (state: ScheduleState, quality: number): ScheduleState => {
  const ease = clamp(state.ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02), 1.3, 3);
  if (quality < 3) return { ease, intervalDays: 1, reviewCount: 0 };
  const intervalDays = state.reviewCount === 0 ? 1 : state.reviewCount === 1 ? 3 : Math.round(state.intervalDays * ease * 10) / 10;
  return { ease, intervalDays: Math.min(intervalDays, 180), reviewCount: state.reviewCount + 1 };
};

export const addDays = (date: Date, days: number) => new Date(date.getTime() + days * 86_400_000);
