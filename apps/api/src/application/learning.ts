import { getExercise, getGraph, unlockedLessons, unlockedBy, type LearningMode } from "@fmc/curriculum";
import { Effect } from "effect";
import { buildQueues, effectiveMastery, MASTERED_THRESHOLD, MIN_ITEMS_FOR_STRUGGLE, STRUGGLING_THRESHOLD, type ProgressSnapshot } from "../domain/engine";
import { LessonLocked, NotFound } from "../domain/errors";
import type { ExerciseProgress } from "../infrastructure/db/schema";
import { round } from "../utils/math";
import { AnalyticsRepository, PracticeRepository, ProgressRepository } from "./ports";

export type ExerciseStatus = "new" | "learning" | "struggling" | "review" | "mastered";

const DAY = 86_400_000;

const findGraph = (courseId: string) =>
  Effect.fromNullable(getGraph(courseId)).pipe(Effect.mapError(() => new NotFound({ resource: "course", id: courseId })));

const toSnapshot = (p: ExerciseProgress): ProgressSnapshot => ({
  exerciseId: p.exercise_id,
  mastery: p.mastery,
  struggle: p.struggle,
  itemsSeen: p.items_seen,
  sessionsCompleted: p.sessions_completed,
  intervalDays: p.interval_days,
  dueAt: p.due_at,
  lastPracticedAt: p.last_practiced_at,
});

export const statusOf = (p: ExerciseProgress | undefined, now = new Date()): ExerciseStatus => {
  if (!p || p.items_seen === 0) return "new";
  if (p.items_seen >= MIN_ITEMS_FOR_STRUGGLE && p.struggle >= STRUGGLING_THRESHOLD) return "struggling";
  if (p.sessions_completed > 0 && p.due_at && p.due_at.getTime() <= now.getTime()) return "review";
  if (p.mastery >= MASTERED_THRESHOLD && p.sessions_completed > 0) return "mastered";
  return "learning";
};

export const progressView = (p: ExerciseProgress, now = new Date()) => {
  const elapsed = p.last_practiced_at ? (now.getTime() - p.last_practiced_at.getTime()) / DAY : 0;
  return {
    exerciseId: p.exercise_id,
    status: statusOf(p, now),
    mastery: round(p.mastery),
    effectiveMastery: round(p.items_seen ? effectiveMastery(p.mastery, elapsed, Math.max(p.interval_days, 1)) : 0),
    struggle: round(p.struggle),
    itemsSeen: p.items_seen,
    cleanSolves: p.clean_solves,
    sessionsCompleted: p.sessions_completed,
    totalTimeMs: p.total_time_ms,
    dueAt: p.due_at?.toISOString() ?? null,
    lastPracticedAt: p.last_practiced_at?.toISOString() ?? null,
    lessonViewedAt: p.lesson_viewed_at?.toISOString() ?? null,
  };
};

const openLessons = (graph: NonNullable<ReturnType<typeof getGraph>>, mode: LearningMode, rows: readonly ExerciseProgress[]) => {
  const byId = new Map(rows.map((r) => [r.exercise_id, { itemsSeen: r.items_seen, sessionsCompleted: r.sessions_completed }]));
  return unlockedLessons(graph, mode, (id) => byId.get(id));
};

export const learnerQueues = (userId: string, courseId: string, mode: LearningMode) =>
  Effect.gen(function* () {
    const graph = yield* findGraph(courseId);
    const rows = yield* Effect.flatMap(ProgressRepository, (r) => r.listForCourse(userId, courseId));
    const open = openLessons(graph, mode, rows);
    return buildQueues(graph, new Map(rows.map((r) => [r.exercise_id, toSnapshot(r)])), new Date(), undefined, (id) => open.has(id));
  });

/** Fails with LessonLocked when path mode hasn't reached this lesson yet. */
export const assertLessonOpen = (userId: string, courseId: string, exerciseId: string, mode: LearningMode) =>
  Effect.gen(function* () {
    if (mode === "audit") return;
    const graph = yield* findGraph(courseId);
    const rows = yield* Effect.flatMap(ProgressRepository, (r) => r.listForCourse(userId, courseId));
    if (openLessons(graph, mode, rows).has(exerciseId)) return;
    const before = unlockedBy(graph, exerciseId);
    return yield* Effect.fail(
      new LessonLocked({ message: `Complete "${before?.exercise.title ?? "the previous lesson"}" to unlock this lesson, or switch to Audit mode in Settings.` }),
    );
  });

export const courseProgress = (userId: string, courseId: string) =>
  Effect.gen(function* () {
    const graph = yield* findGraph(courseId);
    const rows = yield* Effect.flatMap(ProgressRepository, (r) => r.listForCourse(userId, courseId));
    const byId = new Map(rows.map((r) => [r.exercise_id, r]));
    const now = new Date();
    return {
      courseId,
      exercises: rows.map((r) => progressView(r, now)),
      units: graph.course.units.map((u) => {
        const views = u.exercises.map((e) => byId.get(e.id));
        return {
          unitId: u.id,
          total: u.exercises.length,
          started: views.filter((v) => v && v.items_seen > 0).length,
          mastered: views.filter((v) => statusOf(v, now) === "mastered").length,
          mastery: round(views.reduce((a, v) => a + (v && v.items_seen > 0 ? v.mastery : 0), 0) / u.exercises.length),
        };
      }),
    };
  });

export const markLessonViewed = (userId: string, courseId: string, exerciseId: string) =>
  Effect.gen(function* () {
    if (!getExercise(courseId, exerciseId)) return yield* Effect.fail(new NotFound({ resource: "exercise", id: exerciseId }));
    const repo = yield* ProgressRepository;
    yield* repo.ensure(userId, courseId, exerciseId);
    const updated = yield* repo.update(userId, courseId, exerciseId, { lesson_viewed_at: new Date() });
    return progressView(updated);
  });

export const exerciseDetail = (userId: string, courseId: string, exerciseId: string) =>
  Effect.gen(function* () {
    const ref = getExercise(courseId, exerciseId);
    if (!ref) return yield* Effect.fail(new NotFound({ resource: "exercise", id: exerciseId }));
    const progress = yield* Effect.flatMap(ProgressRepository, (r) => r.listForCourse(userId, courseId));
    const byId = new Map(progress.map((p) => [p.exercise_id, p]));
    const sessions = yield* Effect.flatMap(PracticeRepository, (r) => r.recentSessions(userId, courseId, 10, exerciseId));
    const timeline = yield* Effect.flatMap(AnalyticsRepository, (r) => r.masteryTimeline(userId, courseId, exerciseId));
    const own = byId.get(exerciseId);
    return {
      progress: own ? progressView(own) : null,
      prerequisites: ref.exercise.prerequisites.map((id) => {
        const p = byId.get(id);
        return { exerciseId: id, status: statusOf(p), mastery: round(p?.mastery ?? 0) };
      }),
      timeline: timeline.map((t) => ({ at: t.at.toISOString(), mastery: round(t.mastery), struggle: round(t.struggle) })),
      sessions: sessions.map((s) => ({
        id: s.id,
        mode: s.mode,
        completedAt: s.completed_at?.toISOString() ?? null,
        masteryBefore: round(s.mastery_before),
        masteryAfter: s.mastery_after === null ? null : round(s.mastery_after),
      })),
    };
  });
