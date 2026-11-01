import { Effect } from "effect";
import { categoryOf, emailPolicy, type NotificationDraft } from "../domain/notifications";
import { NotFound, ValidationError } from "../domain/errors";
import type { Notification, PushPlatform, User } from "../infrastructure/db/schema";
import { NotificationRepository, PushGateway, PushSubscriptionRepository, UserRepository, type NotificationFilter } from "./ports";

export const toNotificationView = (n: Notification) => ({
  id: n.id,
  kind: n.kind,
  category: n.category,
  title: n.title,
  body: n.body,
  href: n.href,
  data: n.data,
  createdAt: n.created_at.toISOString(),
  seen: n.seen_at !== null,
  read: n.read_at !== null,
  kept: n.kept_at !== null,
});

/**
 * Records a notification for a learner, honouring their preferences (account
 * notices always go through). Push delivery happens later from the outbox.
 */
type Recipient = Pick<User, "id" | "notify_progress" | "notify_reminders" | "notify_email_reminders">;

export const notify = (user: Recipient, draft: NotificationDraft) =>
  Effect.gen(function* () {
    const category = categoryOf(draft.kind);
    if ((category === "progress" && !user.notify_progress) || (category === "reminder" && !user.notify_reminders)) return undefined;
    const policy = emailPolicy(draft.kind);
    const email = policy === "always" || (policy === "reminder" && user.notify_email_reminders);
    return yield* Effect.flatMap(NotificationRepository, (r) => r.create(user.id, { ...draft, category, email }));
  });

/** Notifications are a side effect: a failure is logged, never surfaced to the action that caused it. */
export const notifySafely = (user: Recipient, draft: NotificationDraft) =>
  notify(user, draft).pipe(
    Effect.asVoid,
    Effect.catchAll((e) => Effect.logWarning(`notification ${draft.kind} failed`, e)),
  );

const PAGE = 20;

export const listNotifications = (userId: string, opts: { filter: NotificationFilter; cursor?: string | undefined; limit?: number | undefined }) =>
  Effect.gen(function* () {
    const repo = yield* NotificationRepository;
    const limit = Math.min(opts.limit ?? PAGE, 50);
    const before = opts.cursor ? decodeCursor(opts.cursor) : undefined;
    if (opts.cursor && !before) return yield* Effect.fail(new ValidationError({ message: "Invalid cursor." }));
    const rows = yield* repo.list(userId, { filter: opts.filter, limit: limit + 1, before });
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page.map(toNotificationView),
      nextCursor: rows.length > limit && last ? encodeCursor(last) : null,
      counts: yield* repo.counts(userId),
    };
  });

const encodeCursor = (n: Notification) => Buffer.from(`${n.created_at.toISOString()}|${n.id}`).toString("base64url");
const decodeCursor = (c: string) => {
  const [at, id] = Buffer.from(c, "base64url").toString().split("|");
  const createdAt = new Date(at ?? "");
  return id && /^[0-9a-f-]{36}$/.test(id) && !Number.isNaN(createdAt.getTime()) ? { createdAt, id } : undefined;
};

export const notificationCounts = (userId: string) => Effect.flatMap(NotificationRepository, (r) => r.counts(userId));

export const markNotificationsSeen = (userId: string) =>
  Effect.gen(function* () {
    const repo = yield* NotificationRepository;
    yield* repo.markAllSeen(userId);
    return yield* repo.counts(userId);
  });

const found = (id: string) => (n: Notification | undefined) =>
  n ? Effect.succeed(toNotificationView(n)) : Effect.fail(new NotFound({ resource: "notification", id }));

export const setNotificationRead = (userId: string, id: string, read: boolean) =>
  Effect.flatMap(NotificationRepository, (r) => r.setRead(userId, id, read)).pipe(Effect.flatMap(found(id)));

export const setNotificationKept = (userId: string, id: string, kept: boolean) =>
  Effect.flatMap(NotificationRepository, (r) => r.setKept(userId, id, kept)).pipe(Effect.flatMap(found(id)));

export const dismissNotification = (userId: string, id: string) =>
  Effect.gen(function* () {
    const ok = yield* Effect.flatMap(NotificationRepository, (r) => r.dismiss(userId, id));
    if (!ok) return yield* Effect.fail(new NotFound({ resource: "notification", id }));
    return { dismissed: true };
  });

export const markAllNotificationsRead = (userId: string) =>
  Effect.gen(function* () {
    const repo = yield* NotificationRepository;
    const updated = yield* repo.markAllRead(userId);
    return { updated, counts: yield* repo.counts(userId) };
  });

export const dismissReadNotifications = (userId: string) =>
  Effect.gen(function* () {
    const repo = yield* NotificationRepository;
    const dismissed = yield* repo.dismissRead(userId);
    return { dismissed, counts: yield* repo.counts(userId) };
  });

/* ---- Push registration ---- */

export const pushConfig = Effect.map(PushGateway, (g) => ({ webPublicKey: g.webPublicKey, web: g.enabled.web, ios: g.enabled.ios }));

export const registerPushSubscription = (
  userId: string,
  input: { platform: PushPlatform; endpoint: string; keys?: { p256dh: string; auth: string } | undefined },
  userAgent: string | null,
) =>
  Effect.gen(function* () {
    if (input.platform === "web" && !input.keys) return yield* Effect.fail(new ValidationError({ message: "Web push subscriptions need their keys." }));
    const sub = yield* Effect.flatMap(PushSubscriptionRepository, (r) =>
      r.upsert({ userId, platform: input.platform, endpoint: input.endpoint, p256dh: input.keys?.p256dh ?? null, auth: input.keys?.auth ?? null, userAgent }),
    );
    return { id: sub.id, platform: sub.platform, createdAt: sub.created_at.toISOString() };
  });

export const removePushSubscription = (userId: string, endpoint: string) =>
  Effect.map(
    Effect.flatMap(PushSubscriptionRepository, (r) => r.remove(userId, endpoint)),
    (removed) => ({ removed }),
  );

/** Turns off reminder emails from the token in an email link. Answers the same either way, so tokens can't be probed. */
export const unsubscribeFromReminderEmails = (token: string) =>
  Effect.flatMap(UserRepository, (r) => r.unsubscribeReminderEmails(token)).pipe(Effect.as({ unsubscribed: true }));
