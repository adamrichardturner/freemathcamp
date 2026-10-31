import { formatAnswer, generateProblem, getExercise, type Answer } from "@fmc/curriculum";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/http/app";
import { makeRuntime, type AppRuntime } from "../src/http/runtime";

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
    const res = await post("/api/auth/register", { email: "nope", password: "short", displayName: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.issues.length).toBeGreaterThan(1);
  });

  it("registers, sets an httpOnly session cookie, and returns the user", async () => {
    const res = await post("/api/auth/register", { email, password: "correct-horse-42", displayName: "Ada" });
    expect(res.status).toBe(201);
    expect(res.headers["set-cookie"]?.[0]).toMatch(/fmc_session=.*HttpOnly.*SameSite=Lax/i);
    const me = await agent.get("/api/auth/me");
    expect(me.body.user.email).toBe(email);
    expect(me.body.user).not.toHaveProperty("password_hash");
  });

  it("refuses duplicate accounts and wrong passwords", async () => {
    expect((await post("/api/auth/register", { email, password: "correct-horse-42", displayName: "Ada" })).status).toBe(409);
    const other = request(createApp(runtime, { webOrigin: ORIGIN, secureCookies: false }));
    const res = await other.post("/api/auth/login").set("Origin", ORIGIN).send({ email, password: "wrong-password-1" });
    expect(res.status).toBe(401);
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
