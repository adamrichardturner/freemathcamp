import { checkAnswer, formatAnswer, generateProblem, getExercise, type ExerciseRef, type LearningMode } from "@fmc/curriculum";
import { Effect } from "effect";
import {
  addDays,
  INITIAL_SCHEDULE,
  ITEMS_PER_SESSION,
  itemSignal,
  nextLevel,
  nextSchedule,
  sessionQuality,
  startingLevel,
  updateMastery,
  updateStruggle,
  type ItemSignal,
  type Level,
  type PracticeMode,
} from "../domain/engine";
import { Conflict, NotFound } from "../domain/errors";
import type { PracticeItem, PracticeSession } from "../infrastructure/db/schema";
import { newSeed } from "../infrastructure/security/tokens";
import { mean, round } from "../utils/math";
import { assertLessonOpen, learnerQueues } from "./learning";
import { PracticeRepository, ProgressRepository } from "./ports";

const MAX_TIME_MS = 30 * 60_000;

const findExercise = (courseId: string, exerciseId: string) =>
  Effect.fromNullable(getExercise(courseId, exerciseId)).pipe(Effect.mapError(() => new NotFound({ resource: "exercise", id: exerciseId })));

const itemsOf = (s: PracticeSession) => s.items as unknown as PracticeItem[];

const loadActive = (userId: string, sessionId: string, index: number) =>
  Effect.gen(function* () {
    const practice = yield* PracticeRepository;
    const session = yield* practice.findSession(sessionId, userId);
    if (!session) return yield* Effect.fail(new NotFound({ resource: "practice session", id: sessionId }));
    if (session.status !== "active") return yield* Effect.fail(new Conflict({ message: "This practice session has already finished." }));
    const items = itemsOf(session);
    if (index !== items.length - 1) return yield* Effect.fail(new Conflict({ message: "That problem is no longer the current one." }));
    const ref = yield* findExercise(session.course_id, session.exercise_id);
    return { session, item: items[index]!, ref };
  });

export const startPractice = (userId: string, courseId: string, exerciseId: string, mode: PracticeMode, learningMode: LearningMode) =>
  Effect.gen(function* () {
    const ref = yield* findExercise(courseId, exerciseId);
    yield* assertLessonOpen(userId, courseId, exerciseId, learningMode);
    const progressRepo = yield* ProgressRepository;
    const practice = yield* PracticeRepository;
    const progress = yield* progressRepo.ensure(userId, courseId, exerciseId);
    yield* practice.abandonActive(userId, exerciseId);
    const item: PracticeItem = { seed: newSeed(), level: startingLevel(progress.mastery, mode) };
    const session = yield* practice.createSession({
      userId,
      courseId,
      exerciseId,
      mode,
      targetItems: ITEMS_PER_SESSION[mode],
      firstItem: item,
      masteryBefore: progress.mastery,
    });
    return {
      sessionId: session.id,
      mode,
      targetItems: session.target_items,
      item: { index: 0, ...item },
      mastery: round(progress.mastery),
      expectedSeconds: ref.exercise.expectedSeconds,
    };
  });

interface Resolution {
  wrongAttempts: number;
  revealed: boolean;
  hintsUsed: number;
  timeMs: number;
}

/** Feeds a finished problem into the engine and issues the next one. */
const resolveItem = (userId: string, session: PracticeSession, ref: ExerciseRef, index: number, item: PracticeItem, r: Resolution) =>
  Effect.gen(function* () {
    const practice = yield* PracticeRepository;
    const progressRepo = yield* ProgressRepository;
    const problem = generateProblem(ref, item.seed, item.level);
    const signal = itemSignal({ ...r, expectedSeconds: ref.exercise.expectedSeconds, level: item.level });
    const progress = yield* progressRepo.ensure(userId, session.course_id, session.exercise_id);
    const mastery = updateMastery({ previous: progress.mastery, signal, level: item.level, multipleChoice: problem.answer.kind === "choice" });
    const struggle = updateStruggle(progress.struggle, progress.items_seen, signal.struggle);

    const inserted = yield* practice.recordItemResult({
      sessionId: session.id,
      itemIndex: index,
      userId,
      courseId: session.course_id,
      exerciseId: session.exercise_id,
      level: item.level,
      wrongAttempts: r.wrongAttempts,
      revealed: r.revealed,
      hintsUsed: r.hintsUsed,
      timeMs: r.timeMs,
      struggle: signal.struggle,
      cleanSolve: signal.cleanSolve,
      masteryAfter: mastery,
    });
    if (!inserted) return yield* Effect.fail(new Conflict({ message: "That problem was already completed." }));

    const now = new Date();
    yield* progressRepo.update(userId, session.course_id, session.exercise_id, {
      mastery,
      struggle,
      items_seen: progress.items_seen + 1,
      clean_solves: progress.clean_solves + (signal.cleanSolve ? 1 : 0),
      wrong_attempts: progress.wrong_attempts + r.wrongAttempts,
      reveals: progress.reveals + (r.revealed ? 1 : 0),
      hints_used: progress.hints_used + r.hintsUsed,
      total_time_ms: progress.total_time_ms + r.timeMs,
      last_practiced_at: now,
      first_practiced_at: progress.first_practiced_at ?? now,
    });

    const results = yield* practice.itemResults(session.id);
    let next: { index: number; seed: number; level: Level } | null = null;
    if (results.length < session.target_items) {
      const signals: ItemSignal[] = results.map((x) => ({
        struggle: x.struggle,
        cleanSolve: x.clean_solve,
        components: { errors: 0, hints: 0, time: 0 },
      }));
      const nextItem: PracticeItem = { seed: newSeed(), level: nextLevel(item.level, signals) };
      yield* practice.appendItem(session.id, nextItem);
      next = { index: index + 1, ...nextItem };
    }

    return {
      struggle: round(signal.struggle),
      cleanSolve: signal.cleanSolve,
      mastery: { before: round(progress.mastery), after: round(mastery) },
      levelChange: next ? next.level - item.level : 0,
      next,
      done: next === null,
    };
  });

export const submitAttempt = (userId: string, sessionId: string, input: { index: number; answer: string; timeMs: number; hintsUsed: number }) =>
  Effect.gen(function* () {
    const { session, item, ref } = yield* loadActive(userId, sessionId, input.index);
    const practice = yield* PracticeRepository;
    const problem = generateProblem(ref, item.seed, item.level);
    const result = checkAnswer(problem.answer, input.answer);
    const timeMs = Math.min(input.timeMs, MAX_TIME_MS);
    yield* practice.recordAttempt({ sessionId, userId, itemIndex: input.index, answer: input.answer, correct: result.correct, timeMs });
    if (!result.correct) {
      const wrongAttempts = yield* practice.wrongAttemptsFor(sessionId, input.index);
      return { correct: false as const, feedback: result.feedback ?? null, wrongAttempts };
    }
    const wrongAttempts = yield* practice.wrongAttemptsFor(sessionId, input.index);
    const resolution = yield* resolveItem(userId, session, ref, input.index, item, { wrongAttempts, revealed: false, hintsUsed: input.hintsUsed, timeMs });
    return { correct: true as const, feedback: null, wrongAttempts, ...resolution };
  });

export const revealAnswer = (userId: string, sessionId: string, input: { index: number; timeMs: number; hintsUsed: number }) =>
  Effect.gen(function* () {
    const { session, item, ref } = yield* loadActive(userId, sessionId, input.index);
    const practice = yield* PracticeRepository;
    const problem = generateProblem(ref, item.seed, item.level);
    const wrongAttempts = yield* practice.wrongAttemptsFor(sessionId, input.index);
    const resolution = yield* resolveItem(userId, session, ref, input.index, item, {
      wrongAttempts,
      revealed: true,
      hintsUsed: input.hintsUsed,
      timeMs: Math.min(input.timeMs, MAX_TIME_MS),
    });
    return { answer: formatAnswer(problem.answer, problem.choices), ...resolution };
  });

export const completePractice = (userId: string, sessionId: string, learningMode: LearningMode) =>
  Effect.gen(function* () {
    const practice = yield* PracticeRepository;
    const progressRepo = yield* ProgressRepository;
    const session = yield* practice.findSession(sessionId, userId);
    if (!session) return yield* Effect.fail(new NotFound({ resource: "practice session", id: sessionId }));
    if (session.status !== "active") return yield* Effect.fail(new Conflict({ message: "This session is already complete." }));
    const results = yield* practice.itemResults(sessionId);
    if (results.length === 0) return yield* Effect.fail(new Conflict({ message: "Solve at least one problem before finishing." }));

    const progress = yield* progressRepo.ensure(userId, session.course_id, session.exercise_id);
    const accuracy = results.filter((r) => r.wrong_attempts === 0 && !r.revealed).length / results.length;
    const meanStruggle = mean(results.map((r) => r.struggle));
    const quality = sessionQuality(accuracy, meanStruggle);
    const schedule = nextSchedule(
      progress.sessions_completed === 0 ? INITIAL_SCHEDULE : { ease: progress.ease, intervalDays: progress.interval_days, reviewCount: progress.review_count },
      quality,
    );
    const now = new Date();
    const dueAt = addDays(now, schedule.intervalDays);
    yield* progressRepo.update(userId, session.course_id, session.exercise_id, {
      sessions_completed: progress.sessions_completed + 1,
      ease: schedule.ease,
      interval_days: schedule.intervalDays,
      review_count: schedule.reviewCount,
      due_at: dueAt,
    });
    yield* practice.completeSession(sessionId, progress.mastery);

    const queues = yield* learnerQueues(userId, session.course_id, learningMode);
    const struggledOn = meanStruggle >= 0.45;
    return {
      sessionId,
      exerciseId: session.exercise_id,
      problems: results.length,
      accuracy: round(accuracy),
      meanStruggle: round(meanStruggle),
      quality,
      totalTimeMs: results.reduce((a, r) => a + r.time_ms, 0),
      mastery: { before: round(session.mastery_before), after: round(progress.mastery) },
      nextReviewAt: dueAt.toISOString(),
      intervalDays: schedule.intervalDays,
      items: results.map((r) => ({ index: r.item_index, level: r.level, struggle: round(r.struggle), cleanSolve: r.clean_solve, revealed: r.revealed, wrongAttempts: r.wrong_attempts, timeMs: r.time_ms })),
      brushUp: struggledOn ? (queues.challenge.find((c) => c.exerciseId === session.exercise_id)?.brushUp ?? []) : [],
      upNext: queues.plan.filter((p) => p.exerciseId !== session.exercise_id).slice(0, 3),
    };
  });
