import { describe, expect, it } from "vitest";
import { crossedMilestone, describeDevice, emailPolicy, PROBLEM_MILESTONES } from "../src/domain/notifications";
import { localClock, planReminder, type ReminderSnapshot } from "../src/domain/reminders";

const DAY = 86_400_000;
// Wednesday 2026-11-04, 10:00 in London (UTC+0 in November).
const wed10 = new Date("2026-11-04T10:00:00Z");

const snap = (over: Partial<ReminderSnapshot> = {}): ReminderSnapshot => ({
  now: wed10,
  timeZone: "Europe/London",
  name: "Ada Lovelace",
  joinedAt: new Date(wed10.getTime() - 30 * DAY),
  lastPracticedAt: new Date(wed10.getTime() - 0.5 * DAY),
  streak: { current: 0, activeToday: false },
  reviewsDue: 0,
  problemsToday: 0,
  dailyGoal: 10,
  problemsThisWeek: 0,
  masteredThisWeek: 0,
  nextLesson: { id: "division", title: "Division & Remainders" },
  remindersToday: 0,
  ...over,
});

describe("local clock", () => {
  it("reads the learner's wall clock and day start", () => {
    const c = localClock(new Date("2026-11-04T23:30:00Z"), "Asia/Tokyo");
    expect(c).toMatchObject({ date: "2026-11-05", hour: 8, minute: 30, weekday: "Thu" });
    expect(c.dayStart.toISOString()).toBe("2026-11-04T15:00:00.000Z");
  });
});

describe("reminder planning", () => {
  it("stays quiet at night, and after one reminder today", () => {
    expect(planReminder(snap({ now: new Date("2026-11-04T06:00:00Z"), lastPracticedAt: new Date(wed10.getTime() - 5 * DAY) }))).toBeNull();
    expect(planReminder(snap({ lastPracticedAt: new Date(wed10.getTime() - 5 * DAY), remindersToday: 1 }))).toBeNull();
  });

  it("protects a streak in the evening", () => {
    const r = planReminder(snap({ now: new Date("2026-11-04T18:30:00Z"), streak: { current: 5, activeToday: false } }));
    expect(r).toMatchObject({ kind: "reminder_streak", dedupeKey: "reminder_streak:2026-11-04" });
  });

  it("nudges due reviews in the morning, and an unfinished daily goal in the afternoon", () => {
    expect(planReminder(snap({ reviewsDue: 4 }))?.kind).toBe("reminder_reviews");
    expect(planReminder(snap({ now: new Date("2026-11-04T16:30:00Z"), streak: { current: 1, activeToday: true }, problemsToday: 6 }))).toMatchObject({
      kind: "reminder_goal",
      title: "4 problems to your daily goal",
    });
  });

  it("brings back lapsed learners once per step of the lapse", () => {
    const lapsed = new Date(wed10.getTime() - 7.2 * DAY);
    const r = planReminder(snap({ lastPracticedAt: lapsed }));
    expect(r).toMatchObject({ kind: "reminder_inactive", title: "It's been a week", href: "/courses/foundations/division" });
    expect(r?.dedupeKey).toBe(`reminder_inactive:7:${lapsed.toISOString().slice(0, 10)}`);
    expect(planReminder(snap({ lastPracticedAt: new Date(wed10.getTime() - DAY) }))).toBeNull();
  });

  it("helps new learners start, then stops", () => {
    expect(planReminder(snap({ lastPracticedAt: null, joinedAt: new Date(wed10.getTime() - 1.5 * DAY) }))).toMatchObject({ kind: "reminder_start", dedupeKey: "reminder_start:1" });
    expect(planReminder(snap({ lastPracticedAt: null, joinedAt: new Date(wed10.getTime() - 40 * DAY) }))).toBeNull();
  });

  it("sends a weekly summary on Monday mornings", () => {
    const r = planReminder(snap({ now: new Date("2026-11-02T09:15:00Z"), problemsThisWeek: 42, masteredThisWeek: 2 }));
    expect(r).toMatchObject({ kind: "weekly_summary", dedupeKey: "weekly_summary:2026-11-02" });
    expect(r?.body).toContain("42 problems and mastered 2 lessons");
  });
});

describe("notification helpers", () => {
  it("detects milestone crossings", () => {
    expect(crossedMilestone(PROBLEM_MILESTONES, 95, 103)).toBe(100);
    expect(crossedMilestone(PROBLEM_MILESTONES, 100, 140)).toBeUndefined();
  });

  it("describes devices for security notices", () => {
    expect(describeDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36")).toBe("Chrome on macOS");
    expect(describeDevice(null)).toBe("an unknown device");
  });

  it("emails security notices always and re-engagement reminders optionally", () => {
    expect(emailPolicy("new_sign_in")).toBe("always");
    expect(emailPolicy("reminder_inactive")).toBe("reminder");
    expect(emailPolicy("reminder_streak")).toBeNull();
    expect(emailPolicy("lesson_mastered")).toBeNull();
  });
});
