import { getGraph } from "@fmc/curriculum";
import { Effect } from "effect";
import { NotFound } from "../domain/errors";
import { round } from "../utils/math";
import { learnerQueues, progressView, statusOf } from "./learning";
import { AnalyticsRepository, PracticeRepository, ProgressRepository } from "./ports";

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Current and longest runs of consecutive active (UTC) days. */
export const streaks = (activeDays: string[], today = new Date()) => {
  const days = new Set(activeDays);
  let current = 0;
  const cursor = new Date(`${isoDay(today)}T00:00:00Z`);
  // A streak survives until the end of today even if today has no activity yet.
  if (!days.has(isoDay(cursor))) cursor.setTime(cursor.getTime() - DAY);
  while (days.has(isoDay(cursor))) {
    current++;
    cursor.setTime(cursor.getTime() - DAY);
  }
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const t = Date.parse(`${d}T00:00:00Z`);
    run = prev !== null && t - prev === DAY ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = t;
  }
  return { current, longest, activeToday: days.has(isoDay(today)) };
};

export const dashboard = (userId: string, courseId: string) =>
  Effect.gen(function* () {
    const queues = yield* learnerQueues(userId, courseId);
    const analyticsRepo = yield* AnalyticsRepository;
    const rows = yield* Effect.flatMap(ProgressRepository, (r) => r.listForCourse(userId, courseId));
    const activeDays = yield* analyticsRepo.activeDays(userId);
    const recentDays = yield* analyticsRepo.dailyActivity(userId, courseId, 7);
    const today = recentDays.find((d) => d.day === isoDay(new Date()));
    const total = getGraph(courseId)?.refs.length ?? 0;
    return {
      queues,
      stats: {
        streak: streaks(activeDays),
        today: { problems: today?.problems ?? 0, cleanSolves: today?.cleanSolves ?? 0, timeMs: Number(today?.timeMs ?? 0) },
        week: recentDays.map((d) => ({ day: d.day, problems: d.problems })),
        exercisesTotal: total,
        exercisesStarted: rows.filter((r) => r.items_seen > 0).length,
        exercisesMastered: rows.filter((r) => statusOf(r) === "mastered").length,
        reviewsDue: queues.review.length,
      },
    };
  });

export const analytics = (userId: string, courseId: string) =>
  Effect.gen(function* () {
    const graph = getGraph(courseId);
    if (!graph) return yield* Effect.fail(new NotFound({ resource: "course", id: courseId }));
    const analyticsRepo = yield* AnalyticsRepository;
    const rows = yield* Effect.flatMap(ProgressRepository, (r) => r.listForCourse(userId, courseId));
    const daily = yield* analyticsRepo.dailyActivity(userId, courseId, 120);
    const activeDays = yield* analyticsRepo.activeDays(userId);
    const levels = yield* analyticsRepo.levelBreakdown(userId, courseId);
    const sessions = yield* Effect.flatMap(PracticeRepository, (r) => r.recentSessions(userId, courseId, 12));

    const started = rows.filter((r) => r.items_seen > 0);
    const problems = started.reduce((a, r) => a + r.items_seen, 0);
    const clean = started.reduce((a, r) => a + r.clean_solves, 0);
    const byId = new Map(rows.map((r) => [r.exercise_id, r]));
    const views = started.map((r) => progressView(r));
    const titled = (id: string) => graph.byId.get(id)?.exercise.title ?? id;

    return {
      totals: {
        problems,
        cleanSolves: clean,
        accuracy: problems ? round(clean / problems) : 0,
        timeMs: started.reduce((a, r) => a + r.total_time_ms, 0),
        hintsUsed: started.reduce((a, r) => a + r.hints_used, 0),
        reveals: started.reduce((a, r) => a + r.reveals, 0),
        sessions: started.reduce((a, r) => a + r.sessions_completed, 0),
        exercisesStarted: started.length,
        exercisesMastered: rows.filter((r) => statusOf(r) === "mastered").length,
        exercisesTotal: graph.refs.length,
        streak: streaks(activeDays),
      },
      daily: daily.map((d) => ({
        day: d.day,
        problems: d.problems,
        accuracy: d.problems ? round(d.cleanSolves / d.problems) : 0,
        minutes: round(Number(d.timeMs) / 60_000, 1),
        struggle: round(d.meanStruggle ?? 0),
      })),
      units: graph.course.units.map((u) => {
        const ps = u.exercises.map((e) => byId.get(e.id));
        return {
          unitId: u.id,
          title: u.title,
          mastery: round(ps.reduce((a, p) => a + (p && p.items_seen > 0 ? p.mastery : 0), 0) / u.exercises.length),
          struggle: round(ps.filter((p) => p && p.items_seen > 0).reduce((a, p, _, arr) => a + p!.struggle / arr.length, 0)),
          started: ps.filter((p) => p && p.items_seen > 0).length,
          total: u.exercises.length,
        };
      }),
      levels: levels.map((l) => ({ level: l.level, problems: l.problems, accuracy: l.problems ? round(l.cleanSolves / l.problems) : 0 })),
      strongest: [...views].sort((a, b) => b.mastery - a.mastery).slice(0, 5).map((v) => ({ ...v, title: titled(v.exerciseId) })),
      weakest: [...views].sort((a, b) => b.struggle - a.struggle || a.mastery - b.mastery).slice(0, 5).map((v) => ({ ...v, title: titled(v.exerciseId) })),
      recentSessions: sessions.map((s) => ({
        id: s.id,
        exerciseId: s.exercise_id,
        title: titled(s.exercise_id),
        mode: s.mode,
        completedAt: s.completed_at?.toISOString() ?? null,
        masteryBefore: round(s.mastery_before),
        masteryAfter: s.mastery_after === null ? null : round(s.mastery_after),
      })),
      queues: yield* learnerQueues(userId, courseId),
    };
  });
