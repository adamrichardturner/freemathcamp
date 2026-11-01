import { getCourse, getExercise } from "@fmc/curriculum";
import { Effect } from "effect";
import { randomInt } from "node:crypto";
import { ADMIN_EMAIL, isAdmin } from "../domain/admin";
import { MASTERED_THRESHOLD } from "../domain/engine";
import { TIERS } from "../domain/leagues";
import { NotFound, ValidationError } from "../domain/errors";
import { notices } from "../domain/notifications";
import { PasswordHasher } from "../infrastructure/security/password";
import { round } from "../utils/math";
import { purgeAccount, resetCourseProgress } from "./account";
import { notifySafely } from "./notifications";
import { AccountRepository, AdminRepository, AnalyticsRepository, PracticeRepository, ProgressRepository, UserRepository, type AdminUserRow } from "./ports";
import { progressView } from "./learning";
import { streaks } from "./analytics";

/*
 * The admin panel. Routes are guarded by requireAdmin before any of these run,
 * so they assume the caller is the admin.
 */

const DAY = 86_400_000;
const WINDOW_DAYS = 30;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

const userView = (u: AdminUserRow) => ({
  id: u.id,
  email: u.email,
  displayName: u.displayName,
  username: u.username,
  avatarUrl: u.avatarUrl,
  emailVerified: u.emailVerified,
  signIn: u.hasPassword && u.google ? "both" : u.google ? "google" : "password",
  learningMode: u.learningMode,
  createdAt: u.createdAt.toISOString(),
  lastActiveAt: u.lastActiveAt?.toISOString() ?? null,
  problems: u.problems,
  mastered: u.mastered,
  isAdmin: u.emailVerified && u.email.toLowerCase() === ADMIN_EMAIL,
});

export const adminOverview = (courseId: string) =>
  Effect.gen(function* () {
    const course = getCourse(courseId);
    if (!course) return yield* Effect.fail(new NotFound({ resource: "course", id: courseId }));
    const rows = yield* Effect.flatMap(AdminRepository, (a) => a.overview(courseId, WINDOW_DAYS, MASTERED_THRESHOLD));
    const byDay = new Map(rows.daily.map((d) => [d.day, d]));
    const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
    // Every day in the window, so charts don't skip quiet days.
    const daily = Array.from({ length: WINDOW_DAYS }, (_, i) => {
      const day = isoDay(today - (WINDOW_DAYS - 1 - i) * DAY);
      const d = byDay.get(day);
      return { day, signups: d?.signups ?? 0, activeUsers: d?.activeUsers ?? 0, problems: d?.problems ?? 0, accuracy: d && d.problems ? round(d.cleanSolves / d.problems) : null };
    });
    const lessonStats = new Map(rows.lessons.map((l) => [l.exerciseId, l]));
    const lessons = course.units.flatMap((unit) =>
      unit.exercises.map((e) => {
        const l = lessonStats.get(e.id);
        return {
          exerciseId: e.id,
          title: e.title,
          unit: unit.title,
          learners: l?.learners ?? 0,
          problems: l?.problems ?? 0,
          accuracy: l && l.problems ? round(l.cleanSolves / l.problems) : null,
          mastered: l?.mastered ?? 0,
        };
      }),
    );
    const totalLessons = lessons.length;
    // Learners grouped by the share of the course they've mastered.
    const buckets = [
      { label: "None", test: (n: number) => n === 0 },
      { label: "1–10%", test: (n: number) => n > 0 && n / totalLessons <= 0.1 },
      { label: "11–25%", test: (n: number) => n / totalLessons > 0.1 && n / totalLessons <= 0.25 },
      { label: "26–50%", test: (n: number) => n / totalLessons > 0.25 && n / totalLessons <= 0.5 },
      { label: "51–75%", test: (n: number) => n / totalLessons > 0.5 && n / totalLessons <= 0.75 },
      { label: "76–100%", test: (n: number) => n / totalLessons > 0.75 },
    ].map((b) => ({ label: b.label, users: rows.masteredCounts.filter((m) => b.test(m.mastered)).reduce((a, m) => a + m.users, 0) }));
    const t = rows.totals;
    return {
      totals: { ...t, accuracy: t.problems ? round(t.cleanSolves / t.problems) : 0 },
      daily,
      signIn: rows.signIn,
      modes: rows.modes,
      levels: [1, 2, 3].map((level) => {
        const l = rows.levels.find((x) => x.level === level);
        return { level, problems: l?.problems ?? 0, accuracy: l && l.problems ? round(l.cleanSolves / l.problems) : null };
      }),
      lessons,
      progress: buckets,
      leagues: TIERS.map((name, tier) => {
        const l = rows.leagues.find((x) => x.tier === tier);
        return { tier: name, users: l?.users ?? 0, optedIn: l?.optedIn ?? 0 };
      }),
    };
  });

export const adminUsers = (opts: { query: string; page: number; pageSize: number }) =>
  Effect.gen(function* () {
    const { users, total } = yield* Effect.flatMap(AdminRepository, (a) =>
      a.listUsers({ query: opts.query, limit: opts.pageSize, offset: (opts.page - 1) * opts.pageSize, masteredAt: MASTERED_THRESHOLD }),
    );
    return { users: users.map(userView), total, page: opts.page, pageSize: opts.pageSize };
  });

const findUser = (id: string) =>
  Effect.gen(function* () {
    const user = yield* Effect.flatMap(UserRepository, (u) => u.findById(id));
    if (!user) return yield* Effect.fail(new NotFound({ resource: "account", id }));
    return user;
  });

export const adminUserDetail = (id: string, courseId: string) =>
  Effect.gen(function* () {
    const row = yield* Effect.flatMap(AdminRepository, (a) => a.findUser(id, MASTERED_THRESHOLD));
    if (!row) return yield* Effect.fail(new NotFound({ resource: "account", id }));
    const user = yield* findUser(id);
    const progress = yield* Effect.flatMap(ProgressRepository, (p) => p.listForCourse(id, courseId));
    const sessions = yield* Effect.flatMap(PracticeRepository, (p) => p.recentSessions(id, courseId, 10));
    const analytics = yield* AnalyticsRepository;
    const activeDays = yield* analytics.activeDays(id);
    const daily = yield* analytics.dailyActivity(id, courseId, WINDOW_DAYS);
    const events = yield* Effect.flatMap(AccountRepository, (a) => a.eventsSince(id, "progress_reset", new Date(0)));
    const views = progress.map((p) => progressView(p));
    const problems = daily.reduce((a, d) => a + d.problems, 0);
    const clean = daily.reduce((a, d) => a + d.cleanSolves, 0);
    return {
      user: {
        ...userView(row),
        timezone: user.timezone,
        dailyGoal: user.daily_goal,
        onboarded: user.onboarded_at !== null,
        lastLoginIp: user.last_login_ip,
      },
      stats: {
        streak: streaks(activeDays),
        started: views.filter((v) => v.itemsSeen > 0).length,
        mastered: views.filter((v) => v.status === "mastered").length,
        totalLessons: getCourse(courseId)?.units.reduce((a, u) => a + u.exercises.length, 0) ?? 0,
        last30: { problems, accuracy: problems ? round(clean / problems) : null, timeMs: daily.reduce((a, d) => a + Number(d.timeMs), 0) },
        progressResets: events.length,
      },
      daily: daily.map((d) => ({ day: d.day, problems: d.problems })),
      sessions: sessions.map((s) => ({
        id: s.id,
        exerciseId: s.exercise_id,
        title: getExercise(courseId, s.exercise_id)?.exercise.title ?? s.exercise_id,
        mode: s.mode,
        completedAt: s.completed_at?.toISOString() ?? null,
        masteryBefore: round(s.mastery_before),
        masteryAfter: s.mastery_after === null ? null : round(s.mastery_after),
      })),
    };
  });

/** 16 characters from an unambiguous alphabet, with at least one digit so it passes the password rules. */
const temporaryPassword = () => {
  const letters = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const all = letters + digits;
  const chars = Array.from({ length: 15 }, () => all[randomInt(all.length)]!);
  chars.splice(randomInt(16), 0, digits[randomInt(digits.length)]!);
  return chars.join("");
};

/**
 * Sets a learner's password (or generates a temporary one when none is given),
 * signs them out everywhere and tells them. The password is returned only when
 * it was generated, so the admin can pass it on once.
 */
export const adminSetPassword = (id: string, password: string | undefined) =>
  Effect.gen(function* () {
    const user = yield* findUser(id);
    const plain = password ?? temporaryPassword();
    const hash = yield* Effect.flatMap(PasswordHasher, (h) => h.hash(plain));
    yield* Effect.flatMap(UserRepository, (u) => u.updatePasswordHash(user.id, hash));
    const signedOut = yield* Effect.flatMap(AdminRepository, (a) => a.deleteSessions(user.id));
    yield* Effect.flatMap(AccountRepository, (a) => a.recordEvent(user.id, "password_changed"));
    yield* notifySafely(user, notices.passwordReset());
    return { signedOutSessions: signedOut, temporaryPassword: password === undefined ? plain : null };
  });

export const adminResetProgress = (id: string, courseId: string) => Effect.flatMap(findUser(id), (user) => resetCourseProgress(user, courseId));

/** Deletes a learner's account. The admin's own account can't be removed from here, since it's the only way in. */
export const adminDeleteUser = (id: string, confirmEmail: string) =>
  Effect.gen(function* () {
    const user = yield* findUser(id);
    if (isAdmin(user)) return yield* Effect.fail(new ValidationError({ message: "The admin account can't be deleted from the admin panel." }));
    if (confirmEmail.trim().toLowerCase() !== user.email.toLowerCase())
      return yield* Effect.fail(new ValidationError({ message: "Type the account's email address exactly to confirm." }));
    yield* purgeAccount(user.id);
    return { deleted: true };
  });
