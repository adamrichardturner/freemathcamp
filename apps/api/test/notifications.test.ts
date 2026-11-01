import { generateProblem, getExercise, type Answer } from "@fmc/curriculum";
import { Effect } from "effect";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handle } from "./helpers";
import { deliverPendingEmail, deliverPendingPush } from "../src/application/jobs";
import type { PushMessage } from "../src/application/ports";
import { createApp } from "../src/http/app";
import { buildAppLayer, makeRuntime, type AppRuntime } from "../src/http/runtime";
import { createKysely } from "../src/infrastructure/db/database";
import type { PushSubscription } from "../src/infrastructure/db/schema";
import { outbox } from "../src/infrastructure/email/senders";
import { recordingPushGateway } from "../src/infrastructure/push/gateway";

/** Notification centre, push and email delivery end to end. Needs DATABASE_URL (skipped otherwise). */
const ORIGIN = "http://localhost:3000";
const enabled = !!process.env.DATABASE_URL;
const PASSWORD = "correct-horse-42";
const FCM = "https://fcm.googleapis.com/fcm/send/abc123";
const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const FIREFOX = "Mozilla/5.0 (X11; Linux x86_64; rv:133.0) Gecko/20100101 Firefox/133.0";
/** Lets a test vouch for a client IP the way the Next.js proxy does. */
const PROXY_SECRET = "test-proxy-secret";

const correctInput = (a: Answer) => (a.kind === "choice" ? `${a.correct}` : a.kind === "number" ? `${a.value}` : a.values.join(", "));

describe.skipIf(!enabled)("notifications", () => {
  const pushed: { subscription: PushSubscription; message: PushMessage }[] = [];
  let runtime: AppRuntime;
  let app: ReturnType<typeof createApp>;
  const email = `notify+${Date.now()}@example.com`;
  let agent: ReturnType<typeof request.agent>;
  const send = (method: "post" | "patch" | "delete", path: string, body: object = {}) => agent[method](path).set("Origin", ORIGIN).set("User-Agent", CHROME).send(body);
  const list = (q = "") => agent.get(`/api/me/notifications${q}`).set("User-Agent", CHROME);
  /** Runs an outbox job until it has nothing left (older rows from other tests drain too). */
  const drain = async (job: Effect.Effect<number, unknown, never>) => {
    while ((await runtime.runPromise(job)) > 0);
  };

  beforeAll(() => {
    runtime = makeRuntime(buildAppLayer(recordingPushGateway(pushed)));
    app = createApp(runtime, { webOrigin: ORIGIN, secureCookies: false, proxySecret: PROXY_SECRET });
    agent = request.agent(app);
  });
  afterAll(() => runtime.dispose());

  it("welcomes a new learner, unseen until the centre is opened", async () => {
    expect((await send("post", "/api/auth/register", { email, password: PASSWORD, displayName: "Grace Hopper", username: handle() })).status).toBe(201);
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body.items[0]).toMatchObject({ kind: "welcome", category: "account", title: "Welcome to FreeMathCamp, Grace!", seen: false, read: false, kept: false });
    expect(res.body.counts).toMatchObject({ unseen: 1, unread: 1 });
    expect((await send("post", "/api/me/notifications/seen")).body).toMatchObject({ unseen: 0, unread: 1 });
  });

  it("flags a sign-in only when the IP differs from the previous one, and emails the security notice", async () => {
    const login = (ua: string, ip?: string) => {
      const req = request(app).post("/api/auth/login").set("Origin", ORIGIN).set("User-Agent", ua);
      if (ip) req.set("x-fmc-client-ip", ip).set("x-fmc-proxy-secret", PROXY_SECRET);
      return req.send({ email, password: PASSWORD });
    };
    const signIns = async () => ((await list()).body.items as { kind: string; body: string }[]).filter((n) => n.kind === "new_sign_in");

    // A different browser on the same network as sign-up: no notice.
    expect((await login(FIREFOX)).status).toBe(200);
    expect(await signIns()).toHaveLength(0);

    // A new IP is flagged once; signing in from it again is not.
    expect((await login(FIREFOX, "203.0.113.7")).status).toBe(200);
    expect((await login(CHROME, "203.0.113.7")).status).toBe(200);
    const flagged = await signIns();
    expect(flagged).toHaveLength(1);
    expect(flagged[0]!.body).toContain("Firefox on Linux (203.0.113.7)");

    await drain(deliverPendingEmail as Effect.Effect<number, unknown, never>);
    const mail = outbox.filter((m) => m.to === email);
    expect(mail.map((m) => m.subject)).toEqual(expect.arrayContaining(["New sign-in to your account"]));
    expect(mail.map((m) => m.subject)).not.toContain("Welcome to FreeMathCamp, Grace!");
    expect(mail.find((m) => m.subject === "New sign-in to your account")?.headers).toBeUndefined();
  });

  it("reads, keeps and dismisses, and only for the owner", async () => {
    const [signIn, welcome] = (await list()).body.items as { id: string }[];
    expect((await send("patch", `/api/me/notifications/${welcome!.id}`, { read: true })).body.notification).toMatchObject({ read: true });
    expect((await send("patch", `/api/me/notifications/${welcome!.id}`, { kept: true })).body.notification).toMatchObject({ kept: true });
    expect((await list("?filter=kept")).body.items.map((n: { id: string }) => n.id)).toEqual([welcome!.id]);
    expect((await list("?filter=unread")).body.items.map((n: { id: string }) => n.id)).toEqual([signIn!.id]);

    // Clearing read notifications leaves kept ones alone.
    expect((await send("post", "/api/me/notifications/read-all")).body.counts.unread).toBe(0);
    expect((await send("post", "/api/me/notifications/dismiss-read")).body.dismissed).toBe(1);
    expect((await list()).body.items.map((n: { id: string }) => n.id)).toEqual([welcome!.id]);

    const stranger = request.agent(app);
    await stranger.post("/api/auth/register").set("Origin", ORIGIN).send({ email: `x${email}`, password: PASSWORD, displayName: "Eve", username: handle() });
    expect((await stranger.delete(`/api/me/notifications/${welcome!.id}`).set("Origin", ORIGIN).send({})).status).toBe(404);

    expect((await send("delete", `/api/me/notifications/${welcome!.id}`)).body).toEqual({ dismissed: true });
    expect((await list()).body.counts.total).toBe(0);
    expect((await send("patch", `/api/me/notifications/${welcome!.id}`, { read: false })).status).toBe(404);
  });

  it("only accepts push endpoints from real browser push services", async () => {
    const evil = await send("post", "/api/me/push/subscriptions", { platform: "web", endpoint: "http://169.254.169.254/latest", keys: { p256dh: "BA", auth: "AA" } });
    expect(evil.status).toBe(400);
    const ok = await send("post", "/api/me/push/subscriptions", { platform: "web", endpoint: FCM, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } });
    expect(ok.status).toBe(201);
    expect((await send("post", "/api/me/push/subscriptions", { platform: "ios", token: "a".repeat(64) })).status).toBe(201);
    expect((await agent.get("/api/me/push/config")).body).toMatchObject({ web: true, webPublicKey: "test-public-key" });
  });

  it("celebrates progress and pushes it to every registered device", async () => {
    const mail = [...outbox].reverse().find((m) => m.to === email)!;
    const all = outbox.filter((m) => m.to === email && /verify-email\?token=/.test(m.text));
    const token = new URL(/https?:\/\/\S+verify-email\?token=\S+/.exec(all.at(-1)!.text)![0]).searchParams.get("token")!;
    expect(mail).toBeTruthy();
    expect((await send("post", "/api/auth/verify-email", { token })).status).toBe(200);

    const ref = getExercise("foundations", "place-value")!;
    const start = await send("post", "/api/practice", { courseId: "foundations", exerciseId: "place-value" });
    let item = start.body.item;
    for (let i = 0; i < start.body.targetItems; i++) {
      const problem = generateProblem(ref, item.seed, item.level);
      item = (await send("post", `/api/practice/${start.body.sessionId}/attempts`, { index: i, answer: correctInput(problem.answer), timeMs: 8000, hintsUsed: 0 })).body.next;
    }
    expect((await send("post", `/api/practice/${start.body.sessionId}/complete`)).status).toBe(200);

    const kinds = ((await list()).body.items as { kind: string; title: string }[]).map((n) => `${n.kind}: ${n.title}`);
    expect(kinds).toEqual(expect.arrayContaining(["email_verified: Email confirmed", "lesson_completed: Unlocked: Adding & Subtracting"]));

    await drain(deliverPendingPush as Effect.Effect<number, unknown, never>);
    const mine = pushed.filter((p) => p.message.title === "Unlocked: Adding & Subtracting");
    expect(mine.map((p) => p.subscription.platform).sort()).toEqual(["ios", "web"]);
    expect(mine[0]!.message).toMatchObject({ href: "/courses/foundations/add-subtract", category: "progress" });
  });

  it("respects notification preferences and one-click email unsubscribe", async () => {
    const prefs = await send("patch", "/api/me/preferences", { notifyProgress: false, timezone: "Europe/Paris" });
    expect(prefs.body.user).toMatchObject({ timezone: "Europe/Paris", notifications: { progress: false, reminders: true, emailReminders: true } });
    expect((await send("patch", "/api/me/preferences", { timezone: "Mars/Olympus" })).status).toBe(400);

    const db = createKysely(process.env.DATABASE_URL!);
    const { email_unsubscribe_token } = await db.selectFrom("users").select("email_unsubscribe_token").where("email", "=", email).executeTakeFirstOrThrow();
    await db.destroy();
    // Mail apps POST without cookies, an Origin or JSON.
    const res = await request(app).post(`/api/email/unsubscribe?token=${email_unsubscribe_token}`).type("form").send("List-Unsubscribe=One-Click");
    expect(res.status).toBe(200);
    expect((await agent.get("/api/auth/me")).body.user.notifications.emailReminders).toBe(false);
  });
});
