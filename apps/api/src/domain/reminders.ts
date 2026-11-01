import type { NotificationDraft } from "./notifications";

/** Wall-clock time for a learner, from their IANA time zone. */
export const localClock = (now: Date, timeZone: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23", weekday: "short" })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  // The instant this local day began (exact except across a DST change in the small hours).
  const dayStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000 - (hour * 60 + minute) * 60_000);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour, minute, weekday: parts.weekday as string, dayStart };
};

export const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** Reminders are only sent between these local hours. */
export const SEND_WINDOW = { from: 9, to: 20 } as const;
/** Gaps (in days without practice) at which a "come back" reminder is sent, once each per lapse. */
export const INACTIVE_STEPS = [2, 4, 7, 14, 30] as const;
/** Days after sign-up at which a learner who never practised is nudged. */
export const START_STEPS = [1, 3, 7] as const;

export interface ReminderSnapshot {
  now: Date;
  timeZone: string;
  name: string;
  /** When the learner could first practise (email verified). */
  joinedAt: Date;
  lastPracticedAt: Date | null;
  streak: { current: number; activeToday: boolean };
  reviewsDue: number;
  problemsToday: number;
  dailyGoal: number;
  problemsThisWeek: number;
  masteredThisWeek: number;
  nextLesson: { id: string; title: string } | null;
  /** Reminders already created today (local day), across kinds. */
  remindersToday: number;
}

const DAY = 86_400_000;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const lessonHref = (l: { id: string } | null) => (l ? `/courses/foundations/${l.id}` : "/learn");

/**
 * Chooses at most one reminder for this moment. Pure: the scheduler gathers the
 * snapshot and stores whatever this returns; dedupe keys stop repeats.
 */
export const planReminder = (s: ReminderSnapshot): NotificationDraft | null => {
  const { date, hour, weekday } = localClock(s.now, s.timeZone);
  if (hour < SEND_WINDOW.from || hour >= SEND_WINDOW.to || s.remindersToday > 0) return null;

  if (weekday === "Mon" && hour < 12 && s.problemsThisWeek > 0)
    return {
      kind: "weekly_summary",
      title: "Your week in maths",
      body: `Last week you solved ${plural(s.problemsThisWeek, "problem")}${s.masteredThisWeek ? ` and mastered ${plural(s.masteredThisWeek, "lesson")}` : ""}. Let's make this week even better.`,
      href: "/progress",
      dedupeKey: `weekly_summary:${date}`,
    };

  if (s.streak.current >= 2 && !s.streak.activeToday && hour >= 18)
    return {
      kind: "reminder_streak",
      title: `Keep your ${s.streak.current}-day streak alive`,
      body: "A few problems before bed is all it takes. Your streak resets at midnight.",
      href: "/learn",
      dedupeKey: `reminder_streak:${date}`,
    };

  if (s.reviewsDue >= 3 && !s.streak.activeToday && hour < 13)
    return {
      kind: "reminder_reviews",
      title: `${plural(s.reviewsDue, "review")} due`,
      body: "Reviewing just as you start to forget is the fastest way to make it stick. It takes about 5 minutes.",
      href: "/learn",
      dedupeKey: `reminder_reviews:${date}`,
    };

  if (s.streak.activeToday && s.problemsToday > 0 && s.problemsToday < s.dailyGoal && hour >= 16 && hour < 19) {
    const left = s.dailyGoal - s.problemsToday;
    return {
      kind: "reminder_goal",
      title: `${plural(left, "problem")} to your daily goal`,
      body: "You're nearly there. Finish today's goal while it's fresh.",
      href: "/learn",
      dedupeKey: `reminder_goal:${date}`,
    };
  }

  if (!s.lastPracticedAt) {
    const days = Math.floor((s.now.getTime() - s.joinedAt.getTime()) / DAY);
    const step = [...START_STEPS].reverse().find((d) => days >= d);
    if (step === undefined || days > START_STEPS.at(-1)! + 2) return null;
    return {
      kind: "reminder_start",
      title: `${s.name.split(/\s+/)[0]}, your first lesson is ready`,
      body: s.nextLesson ? `Start with ${s.nextLesson.title}. It takes about 10 minutes, and practice adapts to you.` : "Pick any lesson and try a few problems. Practice adapts to you.",
      href: lessonHref(s.nextLesson),
      dedupeKey: `reminder_start:${step}`,
    };
  }

  const idle = Math.floor((s.now.getTime() - s.lastPracticedAt.getTime()) / DAY);
  const step = [...INACTIVE_STEPS].reverse().find((d) => idle >= d);
  if (step === undefined) return null;
  const lapse = s.lastPracticedAt.toISOString().slice(0, 10);
  const copy: Record<(typeof INACTIVE_STEPS)[number], [string, string]> = {
    2: ["Ready for a quick session?", "A few minutes today keeps what you've learned fresh."],
    4: ["We saved your spot", "Pick up where you left off. Your plan has been adjusted for the time away."],
    7: ["It's been a week", "Maths sticks best with little and often. Ten minutes today makes a real difference."],
    14: ["Your progress is waiting", "Everything you've mastered is still here. Ease back in with a short review."],
    30: ["Come back to Foundations", "It's never too late to pick it back up. Today's plan starts gently."],
  };
  const [title, body] = copy[step];
  return {
    kind: "reminder_inactive",
    title,
    body: s.nextLesson && step <= 7 ? `${body} Next up: ${s.nextLesson.title}.` : body,
    href: step <= 7 ? lessonHref(s.nextLesson) : "/learn",
    dedupeKey: `reminder_inactive:${step}:${lapse}`,
  };
};
