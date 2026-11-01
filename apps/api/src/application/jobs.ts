import { courses } from "@fmc/curriculum";
import { Effect } from "effect";
import { AppConfig } from "../config/config";
import { localClock, isValidTimeZone, planReminder, SEND_WINDOW } from "../domain/reminders";
import { notificationEmail } from "../infrastructure/email/templates";
import type { Notification } from "../infrastructure/db/schema";
import { streaks } from "./analytics";
import { learnerQueues } from "./learning";
import { notify } from "./notifications";
import {
  AnalyticsRepository,
  EmailSender,
  JobLeaseRepository,
  NotificationRepository,
  PushGateway,
  PushSubscriptionRepository,
  ReminderRepository,
  UserRepository,
  type PushResult,
} from "./ports";

const COURSE_ID = courses[0]!.id;
const MAX_PUSH_ATTEMPTS = 5;
/** A push that couldn't go out within a day is no longer worth interrupting someone for. */
const PUSH_STALE_MS = 24 * 3_600_000;

/**
 * Drains the push outbox: each pending notification goes to every device the
 * learner registered. Transient failures retry with backoff; endpoints the push
 * service reports as gone are deleted. Safe to run on several instances at once.
 */
export const deliverPendingPush = Effect.gen(function* () {
  const repo = yield* NotificationRepository;
  const subscriptions = yield* PushSubscriptionRepository;
  const gateway = yield* PushGateway;
  const batch = yield* repo.claimPush(50, 2 * 60_000);
  const badges = new Map<string, number>();

  const deliver = (n: Notification) =>
    Effect.gen(function* () {
      if (n.dismissed_at || n.read_at || Date.now() - n.created_at.getTime() > PUSH_STALE_MS) return yield* repo.finishPush(n.id, "skipped");
      const subs = yield* subscriptions.listForUser(n.user_id);
      if (subs.length === 0) return yield* repo.finishPush(n.id, "skipped");
      if (!badges.has(n.user_id)) badges.set(n.user_id, (yield* repo.counts(n.user_id)).unread);
      const message = { id: n.id, kind: n.kind, category: n.category, title: n.title, body: n.body, href: n.href, badge: badges.get(n.user_id) ?? 0 };

      const results = yield* Effect.forEach(
        subs,
        (sub) =>
          gateway.send(sub, message).pipe(
            Effect.tap((r: PushResult) =>
              r === "gone" ? subscriptions.deleteById(sub.id) : r === "unsupported" ? Effect.void : subscriptions.recordResult(sub.id, r === "ok"),
            ),
          ),
        { concurrency: 4 },
      );
      if (results.includes("ok")) return yield* repo.finishPush(n.id, "sent");
      if (results.includes("retry") && n.push_attempts < MAX_PUSH_ATTEMPTS)
        return yield* repo.finishPush(n.id, "pending", new Date(Date.now() + 30_000 * 2 ** n.push_attempts));
      return yield* repo.finishPush(n.id, results.includes("retry") ? "failed" : "skipped");
    }).pipe(Effect.catchAll((e) => Effect.logWarning(`push for ${n.id} failed`, e)));

  yield* Effect.forEach(batch, deliver, { concurrency: 8, discard: true });
  return batch.length;
});

/**
 * Drains the email outbox. Security notices always go out; reminders are
 * dropped if the learner already read them in the app or turned emails off.
 */
export const deliverPendingEmail = Effect.gen(function* () {
  const repo = yield* NotificationRepository;
  const users = yield* UserRepository;
  const sender = yield* EmailSender;
  const { webOrigin } = yield* AppConfig;
  const batch = yield* repo.claimEmail(20, 5 * 60_000);

  const deliver = (n: Notification) =>
    Effect.gen(function* () {
      const user = yield* users.findById(n.user_id);
      const reminder = n.category === "reminder";
      const stale = Date.now() - n.created_at.getTime() > (reminder ? 12 : 48) * 3_600_000;
      if (!user || stale || (reminder && (n.read_at || n.dismissed_at || !user.notify_email_reminders))) return yield* repo.finishEmail(n.id, "skipped");
      const unsubscribe = reminder ? `${webOrigin}/unsubscribe?token=${user.email_unsubscribe_token}` : undefined;
      const email = notificationEmail({
        name: user.display_name,
        title: n.title,
        body: n.body,
        link: `${webOrigin}${n.href ?? "/learn"}`,
        kind: reminder ? "reminder" : "security",
        unsubscribe,
        oneClickUnsubscribe: reminder ? `${webOrigin}/api/email/unsubscribe?token=${user.email_unsubscribe_token}` : undefined,
        settings: `${webOrigin}/settings#notifications`,
        origin: webOrigin,
      });
      yield* sender.send({ to: user.email, ...email }).pipe(
        Effect.flatMap(() => repo.finishEmail(n.id, "sent")),
        Effect.catchTag("EmailDeliveryError", () =>
          n.email_attempts < 4 ? repo.finishEmail(n.id, "pending", new Date(Date.now() + 60_000 * 4 ** n.email_attempts)) : repo.finishEmail(n.id, "failed"),
        ),
      );
    }).pipe(Effect.catchAll((e) => Effect.logWarning(`email for ${n.id} failed`, e)));

  yield* Effect.forEach(batch, deliver, { concurrency: 4, discard: true });
  return batch.length;
});

/**
 * Looks at every learner with reminders on and, inside their local daytime
 * window, sends at most one well-timed nudge (see `planReminder`).
 */
export const runReminders = (now = new Date()) =>
  Effect.gen(function* () {
    const candidates = yield* Effect.flatMap(ReminderRepository, (r) => r.candidates());
    const notifications = yield* NotificationRepository;
    const reminders = yield* ReminderRepository;
    const analytics = yield* AnalyticsRepository;
    let sent = 0;

    for (const { user, lastPracticedAt } of candidates) {
      const timeZone = isValidTimeZone(user.timezone) ? user.timezone : "UTC";
      const clock = localClock(now, timeZone);
      if (clock.hour < SEND_WINDOW.from || clock.hour >= SEND_WINDOW.to) continue;

      const result = yield* Effect.gen(function* () {
        const remindersToday = yield* notifications.countSince(user.id, "reminder", clock.dayStart);
        if (remindersToday > 0) return false;
        const queues = yield* learnerQueues(user.id, COURSE_ID, user.learning_mode);
        const today = yield* reminders.activitySince(user.id, clock.dayStart);
        const week = yield* reminders.activitySince(user.id, new Date(now.getTime() - 7 * 86_400_000));
        const streak = streaks(yield* analytics.activeDays(user.id), now);
        const next = queues.next[0] ? courses[0]!.units.flatMap((u) => u.exercises).find((e) => e.id === queues.next[0]!.exerciseId) : undefined;
        const draft = planReminder({
          now,
          timeZone,
          name: user.display_name,
          joinedAt: user.email_verified_at ?? user.created_at,
          lastPracticedAt,
          streak,
          reviewsDue: queues.review.length,
          problemsToday: today.problems,
          dailyGoal: user.daily_goal,
          problemsThisWeek: week.problems,
          masteredThisWeek: week.mastered,
          nextLesson: next ? { id: next.id, title: next.title } : null,
          remindersToday,
        });
        return draft ? !!(yield* notify(user, draft)) : false;
      }).pipe(Effect.catchAll((e) => Effect.as(Effect.logWarning(`reminders for ${user.id} failed`, e), false)));
      if (result) sent++;
    }
    return { checked: candidates.length, sent };
  });

/** Runs a job only if this instance holds its lease, so scheduled work never doubles up. */
export const withLease = <A, E, R>(name: string, holder: string, ttlMs: number, job: Effect.Effect<A, E, R>) =>
  Effect.gen(function* () {
    const leases = yield* JobLeaseRepository;
    if (!(yield* leases.acquire(name, holder, ttlMs))) return undefined;
    return yield* job.pipe(Effect.ensuring(leases.release(name, holder).pipe(Effect.ignore)));
  });

export const pruneNotifications = Effect.flatMap(NotificationRepository, (r) => r.prune());
