import { formatAnswer, generateProblem, getExercise, type Answer } from "@fmc/curriculum";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handle } from "./helpers";
import { createApp } from "../src/http/app";
import { makeRuntime, type AppRuntime } from "../src/http/runtime";
import { Effect } from "effect";
import { SessionRepository, UserRepository } from "../src/application/ports";
import { outbox } from "../src/infrastructure/email/senders";
import { hashToken } from "../src/infrastructure/security/tokens";

/** Token from the newest verification email sent to an address. */
const latestToken = (to: string) => {
  const mail = [...outbox].reverse().find((m) => m.to === to);
  return mail && new URL(/https?:\/\/\S+verify-email\?token=\S+/.exec(mail.text)![0]).searchParams.get("token")!;
};

/**
 * End-to-end through Express, Effect and Postgres. Needs DATABASE_URL pointing
 * at a migrated database (pnpm db:up && pnpm db:migrate); skipped otherwise.
 */
const ORIGIN = "http://localhost:3000";
const enabled = !!process.env.DATABASE_URL;

const correctInput = (a: Answer) =>
  a.kind === "choice" ? `${a.correct}` : a.kind === "number" ? `${a.value}` : a.values.join(", ");

describe.skipIf(!enabled)("API", () => {
  let runtime: AppRuntime;
  let agent: ReturnType<typeof request.agent>;
  const email = `learner+${Date.now()}@example.com`;

  beforeAll(() => {
    runtime = makeRuntime();
    agent = request.agent(createApp(runtime, { webOrigin: ORIGIN, secureCookies: false }));
  });
  afterAll(() => runtime.dispose());

  const post = (path: string, body: object = {}) => agent.post(path).set("Origin", ORIGIN).send(body);

  it("rejects cross-origin writes", async () => {
    const res = await agent.post("/api/auth/login").set("Origin", "https://evil.example").send({ email, password: "x" });
    expect(res.status).toBe(403);
  });

  it("validates registration input", async () => {
    const res = await post("/api/auth/register", { email: "nope", password: "short", displayName: "", username: handle() });
    expect(res.status).toBe(400);
    expect(res.body.error.issues.length).toBeGreaterThan(1);
  });

  it("registers, sets an httpOnly session cookie, and returns the user", async () => {
    const res = await post("/api/auth/register", { email, password: "correct-horse-42", displayName: "Ada", username: handle() });
    expect(res.status).toBe(201);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/fmc_session=.*HttpOnly.*SameSite=Lax/i);
    const me = await agent.get("/api/auth/me");
    expect(me.body.user.email).toBe(email);
    expect(me.body.user).not.toHaveProperty("password_hash");
  });

  it("refuses duplicate accounts and wrong passwords", async () => {
    expect((await post("/api/auth/register", { email, password: "correct-horse-42", displayName: "Ada", username: handle() })).status).toBe(409);
    const other = request(createApp(runtime, { webOrigin: ORIGIN, secureCookies: false }));
    const res = await other.post("/api/auth/login").set("Origin", ORIGIN).send({ email, password: "wrong-password-1" });
    expect(res.status).toBe(401);
  });

  it("keeps learner features behind email verification", async () => {
    const res = await agent.get("/api/courses/foundations/dashboard");
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("EmailNotVerified");
    expect((await agent.get("/api/auth/me")).body.user.emailVerified).toBe(false);
  });

  it("verifies the email from the emailed link, once", async () => {
    const token = latestToken(email);
    expect(token).toBeTruthy();
    const ok = await post("/api/auth/verify-email", { token });
    expect(ok.status).toBe(200);
    expect(ok.body.user.emailVerified).toBe(true);
    expect((await post("/api/auth/verify-email", { token })).status).toBe(401);
    expect((await agent.get("/api/courses/foundations/dashboard")).status).toBe(200);
  });

  it("locks lessons in path mode until the one before is complete", async () => {
    expect((await agent.get("/api/auth/me")).body.user).toMatchObject({ learningMode: "path", onboarded: false });
    const locked = await post("/api/practice", { courseId: "foundations", exerciseId: "add-subtract" });
    expect(locked.status).toBe(403);
    expect(locked.body.error.code).toBe("LessonLocked");
    const dash = await agent.get("/api/courses/foundations/dashboard");
    expect(dash.body.queues.next.map((r: { exerciseId: string }) => r.exerciseId)).toEqual(["place-value"]);
    expect((await post("/api/practice", { courseId: "foundations", exerciseId: "place-value" })).status).toBe(201);
  });

  it("opens every lesson in audit mode", async () => {
    const res = await agent.patch("/api/me/preferences").set("Origin", ORIGIN).send({ learningMode: "audit" });
    expect(res.body.user.learningMode).toBe("audit");
    expect((await agent.patch("/api/me/preferences").set("Origin", ORIGIN).send({ learningMode: "sideways" })).status).toBe(400);
    const dash = await agent.get("/api/courses/foundations/dashboard");
    expect(dash.body.queues.next.length).toBeGreaterThan(1);
  });

  it("runs an adaptive practice session end to end and updates progress", async () => {
    const ref = getExercise("foundations", "add-subtract")!;
    const start = await post("/api/practice", { courseId: "foundations", exerciseId: "add-subtract" });
    expect(start.status).toBe(201);
    const { sessionId, targetItems } = start.body;
    let item = start.body.item;

    // First problem: one wrong answer, then correct.
    const wrong = await post(`/api/practice/${sessionId}/attempts`, { index: 0, answer: "-999999", timeMs: 9000, hintsUsed: 0 });
    expect(wrong.body).toMatchObject({ correct: false, wrongAttempts: 1 });

    for (let i = 0; i < targetItems; i++) {
      const problem = generateProblem(ref, item.seed, item.level);
      const res =
        i === 2
          ? await post(`/api/practice/${sessionId}/reveal`, { index: i, timeMs: 60_000, hintsUsed: 2 })
          : await post(`/api/practice/${sessionId}/attempts`, { index: i, answer: correctInput(problem.answer), timeMs: 8000, hintsUsed: 0 });
      expect(res.status, JSON.stringify(res.body)).toBe(200);
      if (i === 2) expect(res.body.answer).toBe(formatAnswer(problem.answer, problem.choices));
      expect(res.body.done).toBe(i === targetItems - 1);
      item = res.body.next;
    }

    // Replaying a resolved item is rejected.
    const replay = await post(`/api/practice/${sessionId}/attempts`, { index: 0, answer: "1", timeMs: 1, hintsUsed: 0 });
    expect(replay.status).toBe(409);

    const done = await post(`/api/practice/${sessionId}/complete`);
    expect(done.status).toBe(200);
    expect(done.body.problems).toBe(targetItems);
    expect(done.body.mastery.after).toBeGreaterThan(done.body.mastery.before);
    expect(new Date(done.body.nextReviewAt).getTime()).toBeGreaterThan(Date.now());

    const progress = await agent.get("/api/courses/foundations/progress");
    const row = progress.body.exercises.find((e: { exerciseId: string }) => e.exerciseId === "add-subtract");
    expect(row).toMatchObject({ itemsSeen: targetItems, sessionsCompleted: 1 });
  });

  it("serves dashboard queues and analytics", async () => {
    const dash = await agent.get("/api/courses/foundations/dashboard");
    expect(dash.status).toBe(200);
    // Back in path mode, a lesson already started stays open.
    await agent.patch("/api/me/preferences").set("Origin", ORIGIN).send({ learningMode: "path" });
    expect((await post("/api/practice", { courseId: "foundations", exerciseId: "add-subtract" })).status).toBe(201);
    expect(dash.body.queues.plan.length).toBeGreaterThan(0);
    expect(dash.body.stats.streak.current).toBe(1);
    const stats = await agent.get("/api/courses/foundations/analytics");
    expect(stats.body.totals.problems).toBeGreaterThan(0);
    expect(stats.body.daily.length).toBe(1);
  });

  it("logs out", async () => {
    await post("/api/auth/logout");
    expect((await agent.get("/api/auth/me")).body.user).toBeNull();
    expect((await agent.get("/api/courses/foundations/dashboard")).status).toBe(401);
  });
});

describe.skipIf(!enabled)("email verification edge cases", () => {
  let runtime: AppRuntime;
  beforeAll(() => {
    runtime = makeRuntime();
  });
  afterAll(() => runtime.dispose());

  it("signs in whoever opens the link, and rate limits resends", async () => {
    const email = `resend+${Date.now()}@example.com`;
    const app = createApp(runtime, { webOrigin: ORIGIN, secureCookies: false });
    const signup = request.agent(app);
    await signup.post("/api/auth/register").set("Origin", ORIGIN).send({ email, password: "correct-horse-42", displayName: "Grace", username: handle() });
    // Two resends are allowed (three emails per hour including the sign-up one), then 429.
    for (const expected of [200, 200, 429]) expect((await signup.post("/api/auth/resend-verification").set("Origin", ORIGIN).send({})).status).toBe(expected);

    const otherDevice = request.agent(app);
    const res = await otherDevice.post("/api/auth/verify-email").set("Origin", ORIGIN).send({ token: latestToken(email) });
    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/fmc_session=/);
    expect((await otherDevice.get("/api/courses/foundations/dashboard")).status).toBe(200);
  });

  it("reclaims an unverified password account when Google proves the email", async () => {
    const email = `claim+${Date.now()}@example.com`;
    const program = Effect.gen(function* () {
      const users = yield* UserRepository;
      const sessions = yield* SessionRepository;
      const squatter = yield* users.create({ email, displayName: "Squatter", username: null, passwordHash: "argon2-hash" });
      const sessionId = hashToken(`squatter-session-${Date.now()}-padding`);
      yield* sessions.create({ id: sessionId, userId: squatter.id, expiresAt: new Date(Date.now() + 86_400_000), userAgent: null, ip: null });
      const owner = yield* users.upsertOAuthUser({ provider: "google", providerUserId: `g-${Date.now()}`, email, displayName: "Owner", avatarUrl: null });
      return { squatter, owner, leftover: yield* sessions.find(sessionId) };
    });
    const { squatter, owner, leftover } = await runtime.runPromise(program);
    expect(leftover).toBeUndefined();
    expect(owner.id).toBe(squatter.id);
    expect(owner.password_hash).toBeNull();
    expect(owner.email_verified_at).not.toBeNull();
  });
});
