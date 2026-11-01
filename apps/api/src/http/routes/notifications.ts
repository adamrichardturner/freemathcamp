import { Effect } from "effect";
import { Router } from "express";
import {
  dismissNotification,
  dismissReadNotifications,
  listNotifications,
  markAllNotificationsRead,
  markNotificationsSeen,
  notificationCounts,
  pushConfig,
  registerPushSubscription,
  removePushSubscription,
  setNotificationKept,
  unsubscribeFromReminderEmails,
  setNotificationRead,
} from "../../application/notifications";
import { currentUser, requireUser } from "../middleware/auth";
import { handle, type AppRuntime } from "../runtime";
import {
  decode,
  NotificationKeepBody,
  NotificationListQuery,
  NotificationParams,
  NotificationReadBody,
  PushSubscribeBody,
  PushUnsubscribeBody,
  UnsubscribeQuery,
} from "../validation";

/** /api/me/notifications — the learner's notification centre. Available before email verification. */
export const notificationRoutes = (runtime: AppRuntime) => {
  const router = Router();
  const h = handle(runtime);
  router.use(requireUser);
  const uid = (req: Parameters<Parameters<typeof h>[0]>[0]) => Effect.map(currentUser(req), (u) => u.id);

  router.get(
    "/",
    h((req) =>
      Effect.gen(function* () {
        const q = yield* decode(NotificationListQuery, req.query);
        return yield* listNotifications(yield* uid(req), q);
      }),
    ),
  );
  // Cheap enough to poll: drives the badge on the avatar.
  router.get("/counts", h((req) => Effect.flatMap(uid(req), notificationCounts)));
  router.post("/seen", h((req) => Effect.flatMap(uid(req), markNotificationsSeen)));
  router.post("/read-all", h((req) => Effect.flatMap(uid(req), markAllNotificationsRead)));
  router.post("/dismiss-read", h((req) => Effect.flatMap(uid(req), dismissReadNotifications)));

  router.patch(
    "/:id",
    h((req) =>
      Effect.gen(function* () {
        const { id } = yield* decode(NotificationParams, req.params);
        const userId = yield* uid(req);
        const body = req.body as Record<string, unknown>;
        if ("read" in body) {
          const { read } = yield* decode(NotificationReadBody, body);
          return { notification: yield* setNotificationRead(userId, id, read) };
        }
        const { kept } = yield* decode(NotificationKeepBody, body);
        return { notification: yield* setNotificationKept(userId, id, kept) };
      }),
    ),
  );
  router.delete(
    "/:id",
    h((req) => Effect.flatMap(decode(NotificationParams, req.params), ({ id }) => Effect.flatMap(uid(req), (userId) => dismissNotification(userId, id)))),
  );

  return router;
};

/** /api/me/push — registering browsers (Web Push) and iOS devices (APNs tokens) for push delivery. */
export const pushRoutes = (runtime: AppRuntime) => {
  const router = Router();
  const h = handle(runtime);
  router.use(requireUser);

  router.get("/config", h(() => pushConfig));
  router.post(
    "/subscriptions",
    h((req, res) =>
      Effect.gen(function* () {
        const body = yield* decode(PushSubscribeBody, req.body);
        const user = yield* currentUser(req);
        const input = body.platform === "web" ? { platform: "web" as const, endpoint: body.endpoint, keys: body.keys } : { platform: "ios" as const, endpoint: body.token.toLowerCase() };
        res.status(201);
        return yield* registerPushSubscription(user.id, input, req.get("user-agent") ?? null);
      }),
    ),
  );
  router.delete(
    "/subscriptions",
    h((req) =>
      Effect.gen(function* () {
        const body = yield* decode(PushUnsubscribeBody, req.body);
        const user = yield* currentUser(req);
        return yield* removePushSubscription(user.id, "endpoint" in body ? body.endpoint : body.token.toLowerCase());
      }),
    ),
  );

  return router;
};

/**
 * POST /api/email/unsubscribe?token=… — RFC 8058 one-click unsubscribe from
 * reminder emails. Mail apps call it without cookies or an Origin header, so
 * it sits outside the CSRF guard; the unguessable token is the credential.
 */
export const emailRoutes = (runtime: AppRuntime) => {
  const router = Router();
  const h = handle(runtime);
  router.post(
    "/unsubscribe",
    h((req) => Effect.flatMap(decode(UnsubscribeQuery, { token: req.query.token ?? (req.body as { token?: unknown } | undefined)?.token }), ({ token }) => unsubscribeFromReminderEmails(token))),
  );
  return router;
};
