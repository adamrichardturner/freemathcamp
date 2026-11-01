import type { NotificationCategory } from "../infrastructure/db/schema";

/** A notification before it's stored: what to say, where it leads, and how to keep it from repeating. */
export interface NotificationDraft {
  kind: NotificationKind;
  title: string;
  body: string;
  href?: string | null;
  data?: Record<string, unknown>;
  /** Unique per learner; a second draft with the same key is ignored. */
  dedupeKey?: string | null;
}

const KINDS = {
  // Account & security: always delivered.
  welcome: "account",
  email_verified: "account",
  new_sign_in: "account",
  google_linked: "account",
  password_changed: "account",
  password_set: "account",
  sessions_revoked: "account",
  progress_reset: "account",
  // Course progress.
  lesson_completed: "progress",
  lesson_mastered: "progress",
  unit_mastered: "progress",
  course_milestone: "progress",
  streak_milestone: "progress",
  daily_goal: "progress",
  problems_milestone: "progress",
  // Engagement reminders.
  reminder_streak: "reminder",
  reminder_reviews: "reminder",
  reminder_goal: "reminder",
  reminder_inactive: "reminder",
  reminder_start: "reminder",
  weekly_summary: "reminder",
} as const satisfies Record<string, NotificationCategory>;

export type NotificationKind = keyof typeof KINDS;
export const categoryOf = (kind: NotificationKind): NotificationCategory => KINDS[kind];

/**
 * Which notifications are also emailed. Security notices always are (no opt-out);
 * re-engagement reminders are, unless the learner unsubscribes. Everything else
 * (milestones, daily nudges) stays in the app and on push so inboxes stay quiet.
 */
const EMAIL: Partial<Record<NotificationKind, "always" | "reminder">> = {
  new_sign_in: "always",
  google_linked: "always",
  password_changed: "always",
  password_set: "always",
  sessions_revoked: "always",
  progress_reset: "always",
  reminder_inactive: "reminder",
  reminder_start: "reminder",
  weekly_summary: "reminder",
};
export const emailPolicy = (kind: NotificationKind) => EMAIL[kind] ?? null;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365] as const;
export const PROBLEM_MILESTONES = [50, 100, 250, 500, 1000, 2500, 5000, 10000] as const;
export const COURSE_MILESTONES = [0.25, 0.5, 0.75, 1] as const;

/** Copy for every notification the app sends, in one place. */
export const notices = {
  welcome: (name: string, verified: boolean): NotificationDraft => ({
    kind: "welcome",
    title: `Welcome to FreeMathCamp, ${firstName(name)}!`,
    body: verified
      ? "Your first lesson is waiting. Short lessons, adaptive practice and a daily plan will take you all the way to calculus."
      : "Confirm your email to unlock practice and progress tracking. Lessons are open while you wait.",
    href: "/learn",
    dedupeKey: "welcome",
  }),
  emailVerified: (): NotificationDraft => ({
    kind: "email_verified",
    title: "Email confirmed",
    body: "Practice, your daily plan and progress tracking are unlocked. Start with today's plan.",
    href: "/learn",
    dedupeKey: "email_verified",
  }),
  newSignIn: (device: string, ip: string | null): NotificationDraft => ({
    kind: "new_sign_in",
    title: "New sign-in to your account",
    body: `Signed in on ${device}${ip ? ` (${ip})` : ""}. If this wasn't you, change your password and sign out other devices.`,
    href: "/settings#security",
    data: { device },
  }),
  googleLinked: (): NotificationDraft => ({
    kind: "google_linked",
    title: "Google sign-in connected",
    body: "You can now sign in with Google as well as your email.",
    href: "/settings#security",
    dedupeKey: "google_linked",
  }),
  passwordChanged: (hadPassword: boolean, signedOut: number): NotificationDraft => ({
    kind: hadPassword ? "password_changed" : "password_set",
    title: hadPassword ? "Password changed" : "Password added",
    body: `${hadPassword ? "Your password was changed." : "You can now sign in with your email and password."}${signedOut ? ` We signed out ${plural(signedOut, "other device")}.` : ""} If this wasn't you, reset it straight away.`,
    href: "/settings#security",
  }),
  sessionsRevoked: (count: number): NotificationDraft => ({
    kind: "sessions_revoked",
    title: "Signed out other devices",
    body: `${plural(count, "other device")} ${count === 1 ? "was" : "were"} signed out. Only this device is signed in now.`,
    href: "/settings#security",
  }),
  progressReset: (course: string): NotificationDraft => ({
    kind: "progress_reset",
    title: `${course} progress reset`,
    body: "Your mastery and review schedule start fresh. Lesson 1 is ready when you are.",
    href: "/courses/foundations",
  }),

  lessonCompleted: (lesson: { id: string; title: string }, next: { id: string; title: string } | null, unlocked: boolean): NotificationDraft => ({
    kind: "lesson_completed",
    title: unlocked && next ? `Unlocked: ${next.title}` : `Lesson complete: ${lesson.title}`,
    body: next
      ? unlocked
        ? `You finished ${lesson.title}, so ${next.title} is now open.`
        : `Nice work on ${lesson.title}. Up next in the course: ${next.title}.`
      : `You finished ${lesson.title}, the last lesson in the course!`,
    href: next ? `/courses/foundations/${next.id}` : `/courses/foundations/${lesson.id}`,
    data: { exerciseId: lesson.id, nextExerciseId: next?.id ?? null },
    dedupeKey: `lesson_completed:${lesson.id}`,
  }),
  lessonMastered: (lesson: { id: string; title: string }): NotificationDraft => ({
    kind: "lesson_mastered",
    title: `Mastered: ${lesson.title}`,
    body: "You've shown solid, consistent understanding. We'll schedule occasional reviews to keep it fresh.",
    href: `/courses/foundations/${lesson.id}`,
    data: { exerciseId: lesson.id },
    dedupeKey: `lesson_mastered:${lesson.id}`,
  }),
  unitMastered: (unit: { id: string; title: string }, unitNumber: number): NotificationDraft => ({
    kind: "unit_mastered",
    title: `Unit ${unitNumber} mastered: ${unit.title}`,
    body: "Every lesson in this unit is mastered. That's a whole branch of maths you own now.",
    href: "/courses/foundations",
    data: { unitId: unit.id },
    dedupeKey: `unit_mastered:${unit.id}`,
  }),
  courseMilestone: (fraction: number, mastered: number, total: number): NotificationDraft => ({
    kind: "course_milestone",
    title: fraction >= 1 ? "Foundations complete!" : `${Math.round(fraction * 100)}% of Foundations mastered`,
    body: fraction >= 1 ? `All ${total} lessons mastered. You're ready for calculus.` : `${mastered} of ${total} lessons mastered. Keep the momentum going.`,
    href: "/progress",
    data: { fraction },
    dedupeKey: `course_milestone:${Math.round(fraction * 100)}`,
  }),
  streakMilestone: (days: number, startedOn: string): NotificationDraft => ({
    kind: "streak_milestone",
    title: `${days}-day streak!`,
    body: days >= 30 ? `${days} days in a row. That's a real habit. Keep it alive tomorrow.` : `You've practised ${days} days in a row. Come back tomorrow to keep it going.`,
    href: "/progress",
    data: { days },
    dedupeKey: `streak_milestone:${days}:${startedOn}`,
  }),
  dailyGoal: (goal: number, day: string): NotificationDraft => ({
    kind: "daily_goal",
    title: "Daily goal reached",
    body: `You've solved ${plural(goal, "problem")} today. Anything extra is a bonus.`,
    href: "/learn",
    dedupeKey: `daily_goal:${day}`,
  }),
  problemsMilestone: (count: number): NotificationDraft => ({
    kind: "problems_milestone",
    title: `${count.toLocaleString("en")} problems solved`,
    body: "Every one of them made the next a little easier. Keep going!",
    href: "/progress",
    data: { count },
    dedupeKey: `problems_milestone:${count}`,
  }),
};

/** The milestone a value just reached, if it crossed one between `before` and `after`. */
export const crossedMilestone = <T extends number>(milestones: readonly T[], before: number, after: number): T | undefined =>
  [...milestones].reverse().find((m) => before < m && after >= m);

/** "Chrome on macOS" from a user agent string; good enough for a security notice. */
export const describeDevice = (ua: string | null): string => {
  if (!ua) return "an unknown device";
  if (/FreeMathCamp\/.*iOS|CFNetwork/i.test(ua)) return "the FreeMathCamp iOS app";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "a browser";
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Mac OS X/.test(ua) ? "macOS" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : null;
  return os ? `${browser} on ${os}` : browser;
};
