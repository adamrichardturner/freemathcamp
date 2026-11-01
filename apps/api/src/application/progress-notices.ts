import { getGraph } from "@fmc/curriculum";
import { Effect } from "effect";
import { MASTERED_THRESHOLD } from "../domain/engine";
import { COURSE_MILESTONES, crossedMilestone, notices, PROBLEM_MILESTONES, STREAK_MILESTONES } from "../domain/notifications";
import type { ExerciseProgress, User } from "../infrastructure/db/schema";
import { streaks } from "./analytics";
import { notifySafely } from "./notifications";
import { AnalyticsRepository, ProgressRepository } from "./ports";

const isMastered = (p: Pick<ExerciseProgress, "mastery" | "sessions_completed"> | undefined) => !!p && p.sessions_completed > 0 && p.mastery >= MASTERED_THRESHOLD;
const DAY = 86_400_000;

/**
 * Celebrates what a just-finished practice session achieved: completing or
 * mastering the lesson, unlocking the next one, unit and course milestones,
 * streaks, the daily goal and problem counts. Dedupe keys make each one-off.
 */
export const noticeSessionProgress = (user: User, courseId: string, exerciseId: string, before: ExerciseProgress, problemsThisSession: number) =>
  Effect.gen(function* () {
    const graph = getGraph(courseId);
    const ref = graph?.byId.get(exerciseId);
    if (!graph || !ref) return;
    const rows = yield* Effect.flatMap(ProgressRepository, (r) => r.listForCourse(user.id, courseId));
    const byId = new Map(rows.map((r) => [r.exercise_id, r]));
    const after = byId.get(exerciseId);
    const lesson = { id: exerciseId, title: ref.exercise.title };

    if (before.sessions_completed === 0) {
      const next = graph.refs[ref.order + 1];
      const nextRow = next && byId.get(next.exercise.id);
      const unlocked = user.learning_mode === "path" && !!next && !(nextRow && nextRow.items_seen > 0);
      yield* notifySafely(user, notices.lessonCompleted(lesson, next ? { id: next.exercise.id, title: next.exercise.title } : null, unlocked));
    }

    const masteredNow = isMastered(after) && !isMastered(before);
    if (masteredNow) {
      yield* notifySafely(user, notices.lessonMastered(lesson));
      if (ref.unit.exercises.every((e) => isMastered(byId.get(e.id))))
        yield* notifySafely(user, notices.unitMastered({ id: ref.unit.id, title: ref.unit.title }, graph.course.units.indexOf(ref.unit) + 1));
      const total = graph.refs.length;
      const mastered = graph.refs.filter((r) => isMastered(byId.get(r.exercise.id))).length;
      const milestone = crossedMilestone(COURSE_MILESTONES, (mastered - 1) / total, mastered / total);
      if (milestone) yield* notifySafely(user, notices.courseMilestone(milestone, mastered, total));
    }

    const analytics = yield* AnalyticsRepository;
    const streak = streaks(yield* analytics.activeDays(user.id));
    if (streak.activeToday && (STREAK_MILESTONES as readonly number[]).includes(streak.current)) {
      const startedOn = new Date(Date.now() - (streak.current - 1) * DAY).toISOString().slice(0, 10);
      yield* notifySafely(user, notices.streakMilestone(streak.current, startedOn));
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayActivity = (yield* analytics.dailyActivity(user.id, courseId, 1)).find((d) => d.day === today);
    if (todayActivity && todayActivity.problems >= user.daily_goal) yield* notifySafely(user, notices.dailyGoal(user.daily_goal, today));

    const solved = rows.reduce((a, r) => a + r.items_seen, 0);
    const problems = crossedMilestone(PROBLEM_MILESTONES, solved - problemsThisSession, solved);
    if (problems) yield* notifySafely(user, notices.problemsMilestone(problems));
  }).pipe(Effect.catchAll((e) => Effect.logWarning("progress notices failed", e)));
