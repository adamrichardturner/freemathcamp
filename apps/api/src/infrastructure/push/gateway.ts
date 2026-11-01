import { createPrivateKey, sign, type KeyObject } from "node:crypto";
import http2 from "node:http2";
import { Effect, Layer, Option, Redacted } from "effect";
import webpush, { WebPushError } from "web-push";
import { AppConfig } from "../../config/config";
import { PushGateway, type PushMessage, type PushResult } from "../../application/ports";
import type { PushSubscription } from "../db/schema";

/*
 * Push delivery without a third-party relay: browsers via the standard Web Push
 * protocol (VAPID-signed, delivered by each browser vendor's push service for
 * free), and iOS via Apple's APNs HTTP/2 API with token (.p8) authentication.
 */

const TIMEOUT_MS = 10_000;

/** Payload the service worker and the iOS app both understand. */
const payload = (m: PushMessage) => ({ id: m.id, kind: m.kind, category: m.category, title: m.title, body: m.body, href: m.href, badge: m.badge });

const webPushSender = (vapid: { publicKey: string; privateKey: string; subject: string }) => (sub: PushSubscription, m: PushMessage) =>
  Effect.tryPromise(() =>
    webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh ?? "", auth: sub.auth ?? "" } }, JSON.stringify(payload(m)), {
      vapidDetails: vapid,
      TTL: 60 * 60 * 24,
      urgency: m.category === "account" ? "high" : "normal",
      timeout: TIMEOUT_MS,
    }),
  ).pipe(
    Effect.as<PushResult>("ok"),
    Effect.catchAll(({ error }) => {
      const status = error instanceof WebPushError ? error.statusCode : 0;
      // 404/410: the browser unsubscribed. 400/403: the subscription doesn't match our keys.
      return Effect.succeed<PushResult>([400, 403, 404, 410].includes(status) ? "gone" : "retry");
    }),
  );

interface ApnsConfig {
  keyId: string;
  teamId: string;
  bundleId: string;
  privateKey: Redacted.Redacted<string>;
  production: boolean;
}

const base64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** APNs provider token: an ES256 JWT, reused for up to 50 minutes as Apple asks. */
const apnsTokens = (cfg: ApnsConfig) => {
  let key: KeyObject | null = null;
  let cached: { token: string; at: number } | null = null;
  return () => {
    if (cached && Date.now() - cached.at < 50 * 60_000) return cached.token;
    key ??= createPrivateKey(Redacted.value(cfg.privateKey).replace(/\\n/g, "\n"));
    const iat = Math.floor(Date.now() / 1000);
    const unsigned = `${base64url(JSON.stringify({ alg: "ES256", kid: cfg.keyId }))}.${base64url(JSON.stringify({ iss: cfg.teamId, iat }))}`;
    const signature = sign("sha256", Buffer.from(unsigned), { key, dsaEncoding: "ieee-p1363" });
    cached = { token: `${unsigned}.${base64url(signature)}`, at: Date.now() };
    return cached.token;
  };
};

const apnsSender = (cfg: ApnsConfig) => {
  const token = apnsTokens(cfg);
  const origin = cfg.production ? "https://api.push.apple.com" : "https://api.sandbox.push.apple.com";
  let session: http2.ClientHttp2Session | null = null;
  const connection = () => {
    if (session && !session.closed && !session.destroyed) return session;
    session = http2.connect(origin);
    session.on("error", () => session?.destroy());
    session.unref();
    return session;
  };

  return (sub: PushSubscription, m: PushMessage) =>
    Effect.async<PushResult>((resume) => {
      const body = JSON.stringify({
        aps: { alert: { title: m.title, body: m.body }, badge: m.badge, sound: "default", "thread-id": m.category },
        ...payload(m),
      });
      const req = connection().request({
        ":method": "POST",
        ":path": `/3/device/${sub.endpoint}`,
        authorization: `bearer ${token()}`,
        "apns-topic": cfg.bundleId,
        "apns-push-type": "alert",
        "apns-priority": "10",
        "apns-collapse-id": m.id.slice(0, 64),
        "content-type": "application/json",
      });
      let status = 0;
      let response = "";
      req.setTimeout(TIMEOUT_MS, () => req.close(http2.constants.NGHTTP2_CANCEL));
      req.on("response", (h) => (status = Number(h[":status"])));
      req.on("data", (chunk) => (response += chunk));
      req.on("end", () => {
        if (status === 200) return resume(Effect.succeed("ok"));
        const reason = (() => {
          try {
            return (JSON.parse(response) as { reason?: string }).reason ?? "";
          } catch {
            return "";
          }
        })();
        // 410 Unregistered, or a token that will never be valid for this app.
        const gone = status === 410 || ["BadDeviceToken", "DeviceTokenNotForTopic", "Unregistered"].includes(reason);
        if (!gone && status !== 429 && status < 500) console.warn(`[apns] ${status} ${reason}`);
        resume(Effect.succeed(gone ? "gone" : "retry"));
      });
      req.on("error", () => resume(Effect.succeed("retry")));
      req.end(body);
    });
};

export const PushGatewayLive = Layer.effect(
  PushGateway,
  Effect.gen(function* () {
    const config = yield* AppConfig;
    const vapid = Option.getOrNull(Option.map(config.vapid, (v) => ({ publicKey: v.publicKey, privateKey: Redacted.value(v.privateKey), subject: v.subject })));
    const apns = Option.getOrNull(config.apns);
    const web = vapid ? webPushSender(vapid) : null;
    const ios = apns ? apnsSender(apns) : null;
    return {
      webPublicKey: vapid?.publicKey ?? null,
      enabled: { web: !!web, ios: !!ios },
      send: (sub, message) => {
        const sender = sub.platform === "web" ? web : ios;
        return sender ? sender(sub, message) : Effect.succeed<PushResult>("unsupported");
      },
    };
  }),
);

/** For tests: records what would have been pushed. */
export const recordingPushGateway = (sent: { subscription: PushSubscription; message: PushMessage }[], result: PushResult = "ok") =>
  Layer.succeed(PushGateway, {
    webPublicKey: "test-public-key",
    enabled: { web: true, ios: true },
    send: (subscription, message) => Effect.sync(() => (sent.push({ subscription, message }), result)),
  });
