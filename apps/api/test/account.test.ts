import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handle } from "./helpers";
import { createApp } from "../src/http/app";
import { makeRuntime, type AppRuntime } from "../src/http/runtime";
import { createKysely } from "../src/infrastructure/db/database";

/** Account settings end to end. Needs DATABASE_URL (skipped otherwise). */
const ORIGIN = "http://localhost:3000";
const enabled = !!process.env.DATABASE_URL;
const PASSWORD = "correct-horse-42";

describe.skipIf(!enabled)("account settings", () => {
  let runtime: AppRuntime;
  let app: ReturnType<typeof createApp>;
  beforeAll(() => {
    runtime = makeRuntime();
    app = createApp(runtime, { webOrigin: ORIGIN, secureCookies: false });
  });
  afterAll(() => runtime.dispose());

  const signUp = async () => {
    const agent = request.agent(app);
    const email = `settings+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    const res = await agent.post("/api/auth/register").set("Origin", ORIGIN).send({ email, password: PASSWORD, displayName: "Ada", username: handle() });
    expect(res.status).toBe(201);
    const send = (method: "post" | "patch" | "delete", path: string, body: object = {}) => agent[method](path).set("Origin", ORIGIN).send(body);
    return { agent, email, send };
  };

  it("returns settings, including before email verification", async () => {
    const { agent } = await signUp();
    const res = await agent.get("/api/me/settings");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ user: { displayName: "Ada", dailyGoal: 10, emailVerified: false }, nameChanges: { remaining: 3, limit: 3 }, security: { activeSessions: 1, otherSessions: 0 } });
  });

  it("limits display name changes to three a day, ignoring no-op saves", async () => {
    const { agent, send } = await signUp();
    expect((await send("patch", "/api/me/profile", { displayName: "Ada", username: handle() })).status).toBe(200); // unchanged: not counted
    for (const name of ["Ada L", "Ada Lovelace", "Countess Ada"]) expect((await send("patch", "/api/me/profile", { displayName: name })).body.user.displayName).toBe(name);
    const blocked = await send("patch", "/api/me/profile", { displayName: "Augusta", username: handle() });
    expect(blocked.status).toBe(429);
    const settings = (await agent.get("/api/me/settings")).body;
    expect(settings.nameChanges.remaining).toBe(0);
    expect(new Date(settings.nameChanges.nextAllowedAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("validates and saves preferences", async () => {
    const { send } = await signUp();
    expect((await send("patch", "/api/me/preferences", { dailyGoal: 0 })).status).toBe(400);
    expect((await send("patch", "/api/me/preferences", { dailyGoal: 20 })).body.user.dailyGoal).toBe(20);
    const onboarded = await send("post", "/api/me/onboarding/complete");
    expect(onboarded.body.user.onboarded).toBe(true);
  });

  it("changes the password, requiring the current one, and signs out other devices", async () => {
    const { email, send } = await signUp();
    const otherDevice = request.agent(app);
    await otherDevice.post("/api/auth/login").set("Origin", ORIGIN).send({ email, password: PASSWORD });
    expect((await otherDevice.get("/api/auth/me")).body.user).not.toBeNull();

    expect((await send("post", "/api/me/password", { currentPassword: "wrong-pass-1", newPassword: "brand-new-pass-7" })).status).toBe(401);
    const ok = await send("post", "/api/me/password", { currentPassword: PASSWORD, newPassword: "brand-new-pass-7" });
    expect(ok.status).toBe(200);
    expect(ok.body.signedOutSessions).toBe(1);
    expect((await otherDevice.get("/api/auth/me")).body.user).toBeNull();
    const relogin = await request(app).post("/api/auth/login").set("Origin", ORIGIN).send({ email, password: "brand-new-pass-7" });
    expect(relogin.status).toBe(200);
  });

  it("exports the learner's data as a download", async () => {
    const { agent, email } = await signUp();
    const res = await agent.get("/api/me/export");
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toMatch(/attachment; filename="freemathcamp-data-/);
    expect(res.body.account.email).toBe(email);
    expect(res.body.account).not.toHaveProperty("password_hash");
  });

  it("deletes the account and everything it owns", async () => {
    const { agent, email, send } = await signUp();
    const userId = (await agent.get("/api/auth/me")).body.user.id;
    expect((await send("delete", "/api/me", { confirmEmail: "someone@else.com", password: PASSWORD })).status).toBe(400);
    expect((await send("delete", "/api/me", { confirmEmail: email, password: "wrong-pass-1" })).status).toBe(401);
    const res = await send("delete", "/api/me", { confirmEmail: email.toUpperCase(), password: PASSWORD });
    expect(res.status).toBe(200);
    expect((await agent.get("/api/auth/me")).body.user).toBeNull();

    const db = createKysely(process.env.DATABASE_URL!);
    const left = await Promise.all(
      (["users", "sessions", "email_verification_tokens", "account_events"] as const).map((t) =>
        db.selectFrom(t).select((eb) => eb.fn.countAll<string>().as("n")).where(t === "users" ? "id" : "user_id", "=", userId).executeTakeFirstOrThrow(),
      ),
    );
    await db.destroy();
    expect(left.map((r) => Number(r.n))).toEqual([0, 0, 0, 0]);
  });
});
