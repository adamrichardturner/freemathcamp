import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handle } from "./helpers";
import { ADMIN_EMAIL, isAdmin } from "../src/domain/admin";
import { createApp } from "../src/http/app";
import { makeRuntime, type AppRuntime } from "../src/http/runtime";
import { createKysely } from "../src/infrastructure/db/database";
import { hashToken, newSessionToken } from "../src/infrastructure/security/tokens";

describe("isAdmin", () => {
  it("needs the admin email, confirmed", () => {
    const at = new Date();
    expect(isAdmin({ email: ADMIN_EMAIL, email_verified_at: at })).toBe(true);
    expect(isAdmin({ email: ADMIN_EMAIL.toUpperCase(), email_verified_at: at })).toBe(true);
    expect(isAdmin({ email: ADMIN_EMAIL, email_verified_at: null })).toBe(false);
    expect(isAdmin({ email: `x${ADMIN_EMAIL}`, email_verified_at: at })).toBe(false);
  });
});

/** The admin API end to end. Needs DATABASE_URL (skipped otherwise). */
const ORIGIN = "http://localhost:3000";
const enabled = !!process.env.DATABASE_URL;
const PASSWORD = "correct-horse-42";
const SOME_ID = "00000000-0000-4000-8000-000000000000";

describe.skipIf(!enabled)("admin API", () => {
  let runtime: AppRuntime;
  let app: ReturnType<typeof createApp>;
  let db: ReturnType<typeof createKysely>;
  let adminCookie: string;
  let adminSession: string;
  let createdAdmin: string | null = null;

  beforeAll(async () => {
    runtime = makeRuntime();
    app = createApp(runtime, { webOrigin: ORIGIN, secureCookies: false });
    db = createKysely(process.env.DATABASE_URL!);
    // Sign in as the admin by minting a session, so an existing admin's password is never touched.
    let admin = await db.selectFrom("users").select(["id", "email_verified_at"]).where("email", "=", ADMIN_EMAIL).executeTakeFirst();
    if (!admin) {
      admin = await db.insertInto("users").values({ email: ADMIN_EMAIL, display_name: "Admin", password_hash: null, email_verified_at: new Date() }).returning(["id", "email_verified_at"]).executeTakeFirstOrThrow();
      createdAdmin = admin.id;
    }
    expect(admin.email_verified_at).not.toBeNull();
    const token = newSessionToken();
    adminSession = hashToken(token);
    await db.insertInto("sessions").values({ id: adminSession, user_id: admin.id, expires_at: new Date(Date.now() + 3_600_000), user_agent: "admin-test", ip: null }).execute();
    adminCookie = `fmc_session=${token}`;
  });
  afterAll(async () => {
    await db.deleteFrom("sessions").where("id", "=", adminSession).execute();
    if (createdAdmin) await db.deleteFrom("users").where("id", "=", createdAdmin).execute();
    await db.destroy();
    await runtime.dispose();
  });

  const signUp = async (verified = true) => {
    const agent = request.agent(app);
    const email = `admin-target+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    expect((await agent.post("/api/auth/register").set("Origin", ORIGIN).send({ email, password: PASSWORD, displayName: "Learner", username: handle() })).status).toBe(201);
    if (verified) await db.updateTable("users").set({ email_verified_at: new Date() }).where("email", "=", email).execute();
    const id = (await agent.get("/api/auth/me")).body.user.id as string;
    return { agent, email, id };
  };

  const asAdmin = (method: "get" | "post" | "delete", path: string, body?: object) => {
    const req = request(app)[method](path).set("Cookie", adminCookie).set("Origin", ORIGIN);
    return body ? req.send(body) : req;
  };

  /** Every admin route, so the access check is proven for each one. */
  const routes = (id: string) =>
    [
      ["get", "/api/admin/overview/foundations"],
      ["get", "/api/admin/users"],
      ["get", `/api/admin/users/${id}/foundations`],
      ["post", `/api/admin/users/${id}/password`, {}],
      ["post", `/api/admin/users/${id}/reset-progress`, { courseId: "foundations" }],
      ["delete", `/api/admin/users/${id}`, { confirmEmail: "x@example.com" }],
    ] as const;

  it("refuses signed-out callers on every route", async () => {
    for (const [method, path, body] of routes(SOME_ID)) {
      const res = await request(app)[method](path).set("Origin", ORIGIN).send(body);
      expect(res.status, `${method} ${path}`).toBe(401);
    }
  });

  it("refuses every other account, verified or not, and leaves the target untouched", async () => {
    const target = await signUp();
    for (const verified of [true, false]) {
      const { agent } = await signUp(verified);
      expect((await agent.get("/api/auth/me")).body.user.isAdmin).toBe(false);
      for (const [method, path, body] of routes(target.id)) {
        const res = await agent[method](path).set("Origin", ORIGIN).send(body);
        expect(res.status, `${method} ${path}`).toBe(403);
        expect(res.body.error.code).toBe("Forbidden");
      }
    }
    // The target can still sign in with the original password.
    expect((await request(app).post("/api/auth/login").set("Origin", ORIGIN).send({ email: target.email, password: PASSWORD })).status).toBe(200);
  });

  it("lets the admin see analytics and find accounts", async () => {
    const { email, id } = await signUp();
    expect((await asAdmin("get", "/api/auth/me")).body.user.isAdmin).toBe(true);

    const overview = await asAdmin("get", "/api/admin/overview/foundations");
    expect(overview.status).toBe(200);
    expect(overview.body.daily).toHaveLength(30);
    expect(overview.body.totals.users).toBeGreaterThan(0);
    expect(overview.body.lessons.length).toBeGreaterThan(90);

    const found = await asAdmin("get", `/api/admin/users?q=${encodeURIComponent(email.toUpperCase())}`);
    expect(found.body).toMatchObject({ total: 1, users: [{ id, email, problems: 0, mastered: 0, signIn: "password" }] });
    // LIKE wildcards are searched literally.
    expect((await asAdmin("get", "/api/admin/users?q=%25%25%25nobody").send()).body.total).toBe(0);

    const detail = await asAdmin("get", `/api/admin/users/${id}/foundations`);
    expect(detail.body.user).toMatchObject({ id, email, emailVerified: true });
    expect(detail.body).not.toHaveProperty("user.passwordHash");
    expect((await asAdmin("get", `/api/admin/users/${SOME_ID}/foundations`)).status).toBe(404);
  });

  it("sets or resets a password, signing the learner out everywhere", async () => {
    const { agent, email, id } = await signUp();
    const set = await asAdmin("post", `/api/admin/users/${id}/password`, { password: "admin-chosen-9" });
    expect(set.body).toMatchObject({ signedOutSessions: 1, temporaryPassword: null });
    expect((await agent.get("/api/auth/me")).body.user).toBeNull();
    const login = (password: string) => request(app).post("/api/auth/login").set("Origin", ORIGIN).send({ email, password });
    expect((await login(PASSWORD)).status).toBe(401);
    expect((await login("admin-chosen-9")).status).toBe(200);

    expect((await asAdmin("post", `/api/admin/users/${id}/password`, { password: "short" })).status).toBe(400);
    const reset = await asAdmin("post", `/api/admin/users/${id}/password`, {});
    expect(reset.body.temporaryPassword).toMatch(/^[A-Za-z0-9]{16}$/);
    expect((await login(reset.body.temporaryPassword)).status).toBe(200);
  });

  it("resets progress and deletes accounts, but never the admin's", async () => {
    const { email, id } = await signUp();
    expect((await asAdmin("post", `/api/admin/users/${id}/reset-progress`, { courseId: "foundations" })).body).toEqual({ ok: true });

    expect((await asAdmin("delete", `/api/admin/users/${id}`, { confirmEmail: "someone@else.com" })).status).toBe(400);
    expect((await asAdmin("delete", `/api/admin/users/${id}`, { confirmEmail: email })).body).toEqual({ deleted: true });
    expect((await asAdmin("get", `/api/admin/users/${id}/foundations`)).status).toBe(404);

    const adminId = (await asAdmin("get", "/api/auth/me")).body.user.id;
    expect((await asAdmin("delete", `/api/admin/users/${adminId}`, { confirmEmail: ADMIN_EMAIL })).status).toBe(400);
  });
});
