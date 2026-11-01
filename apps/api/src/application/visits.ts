import { Effect } from "effect";
import { round } from "../utils/math";
import { VisitRepository, type TimeBucket, type TimeUnit, type VisitTotals } from "./ports";

/*
 * Time on site. The web app sends a heartbeat with the time the learner was
 * actively using the page (visible, with input in the last couple of minutes);
 * everything here reads those visits back as per-period totals.
 */

const DAY = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);
const minutes = (ms: number) => round(ms / 60_000, 1);

/** The start of each of the last `count` periods, oldest first, keyed like the repository's buckets. */
export const periodStarts = (unit: TimeUnit, count: number, now = new Date()) => {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Array.from({ length: count }, (_, i) => {
    const back = count - 1 - i;
    if (unit === "day") return isoDay(today - back * DAY);
    if (unit === "week") return isoDay(today - ((new Date(today).getUTCDay() + 6) % 7) * DAY - back * 7 * DAY);
    return isoDay(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
  });
};

/** Every period in the window, so charts don't skip quiet ones. */
export const fillPeriods = (rows: TimeBucket[], unit: TimeUnit, count: number, now = new Date()) => {
  const byPeriod = new Map(rows.map((r) => [r.period, r]));
  return periodStarts(unit, count, now).map((period) => {
    const r = byPeriod.get(period);
    return { period, minutes: minutes(r?.activeMs ?? 0), visits: r?.visits ?? 0, users: r?.users ?? 0 };
  });
};

const totalsView = (t: VisitTotals) => ({
  minutes: minutes(t.activeMs),
  visits: t.visits,
  avgVisitMinutes: t.visits ? minutes(t.activeMs / t.visits) : 0,
  todayMinutes: minutes(t.todayMs),
  last7Minutes: minutes(t.last7Ms),
  last30Minutes: minutes(t.last30Ms),
});

/** How many of each period the charts show. */
export const WINDOWS: Record<TimeUnit, number> = { day: 30, week: 12, month: 12 };

const series = (userId: string | null) =>
  Effect.gen(function* () {
    const visits = yield* VisitRepository;
    const [day, week, month] = yield* Effect.all([
      visits.buckets(userId, "day", WINDOWS.day),
      visits.buckets(userId, "week", WINDOWS.week),
      visits.buckets(userId, "month", WINDOWS.month),
    ]);
    return { daily: fillPeriods(day, "day", WINDOWS.day), weekly: fillPeriods(week, "week", WINDOWS.week), monthly: fillPeriods(month, "month", WINDOWS.month) };
  });

export const recordVisit = (userId: string, visitId: string, activeMs: number) => Effect.flatMap(VisitRepository, (v) => v.record(userId, visitId, activeMs));

/** One learner's time on site: totals, per day/week/month, and their latest visits. */
export const learnerTime = (userId: string) =>
  Effect.gen(function* () {
    const visits = yield* VisitRepository;
    const totals = yield* visits.totals(userId);
    const recent = yield* visits.recent(userId, 10);
    return {
      totals: totalsView(totals),
      ...(yield* series(userId)),
      recentVisits: recent.map((v) => ({ id: v.id, startedAt: v.startedAt.toISOString(), lastSeenAt: v.lastSeenAt.toISOString(), minutes: minutes(v.activeMs) })),
    };
  });

/** The last 7 days for the dashboard. */
export const weekTime = (userId: string) =>
  Effect.gen(function* () {
    const visits = yield* VisitRepository;
    const days = yield* visits.buckets(userId, "day", 7);
    const week = fillPeriods(days, "day", 7).map((d) => ({ day: d.period, minutes: d.minutes }));
    return { todayMinutes: week.at(-1)?.minutes ?? 0, weekMinutes: round(week.reduce((a, d) => a + d.minutes, 0), 1), week };
  });

/** Everyone's time on site, for the admin panel. */
export const siteTime = Effect.gen(function* () {
  const totals = yield* Effect.flatMap(VisitRepository, (v) => v.totals(null));
  return {
    totals: {
      ...totalsView(totals),
      learners: totals.users,
      learners30: totals.users30,
      avgPerLearner30Minutes: totals.users30 ? minutes(totals.last30Ms / totals.users30) : 0,
    },
    ...(yield* series(null)),
  };
});
