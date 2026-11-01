import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { handle } from "./helpers";
import { fillPeriods, periodStarts } from "../src/application/visits";
import { createApp } from "../src/http/app";
import { makeRuntime, type AppRuntime } from "../src/http/runtime";
import { createKysely } from "../src/infrastructure/db/database";

describe("periodStarts", () => {
  const now = new Date("2026-03-04T15:00:00Z"); // a Wednesday

  it("counts back days, Monday-first weeks and calendar months", () => {
    expect(periodStarts("day", 3, now)).toEqual(["2026-03-02", "2026-03-03", "2026-03-04"]);
    expect(periodStarts("week", 3, now)).toEqual(["2026-02-16", "2026-02-23", "2026-03-02"]);
    expect(periodStarts("month", 4, now)).toEqual(["2025-12-01", "2026-01-01", "2026-02-01", "2026-03-01"]);
  });

  it("fills quiet periods with zero", () => {
    const rows = fillPeriods([{ period: "2026-03-03", activeMs: 90_000, visits: 2, users: 1 }], "day", 3, now);
    expect(rows).toEqual([
      { period: "2026-03-02", minutes: 0, visits: 0, users: 0 },
      { period: "2026-03-03", minutes: 1.5, visits: 2, users: 1 },
      { period: "2026-03-04", minutes: 0, visits: 0, users: 0 },
    ]);
  });
});

/** Heartbeats end to end. Needs DATABASE_URL (skipped otherwise). */
const ORIGIN = "http://localhost:3000";
const enabled = !!process.env.DATABASE_URL;

describe.skipIf(!enabled)("time on site", () => {
  let runtime: AppRuntime;
  let app: ReturnType<typeof createApp>;
  let db: ReturnType<typeof createKysely>;

  beforeAll(() => {
    runtime = makeRuntime();
    app = createApp(runtime, { webOrigin: ORIGIN, secureCookies: false });
    db = createKysely(process.env.DATABASE_URL!);
  });
  afterAll(async () => {
    await db.destroy();
    await runtime.dispose();
  });

  const signUp = async () => {
    const agent = request.agent(app);
    const email = `visits+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    expect((await agent.post("/api/auth/register").set("Origin", ORIGIN).send({ email, password: "correct-horse-42", displayName: "Visitor", username: handle("v") })).status).toBe(201);
    await db.updateTable("users").set({ email_verified_at: new Date() }).where("email", "=", email).execute();
    const id = (await agent.get("/api/auth/me")).body.user.id as string;
    return { agent, id };
  };
  const beat = (agent: ReturnType<typeof request.agent>, visitId: string, activeMs: number) => agent.post("/api/me/activity").set("Origin", ORIGIN).send({ visitId, activeMs });

  it("records active time per visit and caps it by the time that really passed", async () => {
    const { agent, id } = await signUp();
    const visitId = crypto.randomUUID();
    expect((await beat(agent, visitId, 30_000)).status).toBe(200);
    // Sent straight after: only the slack since the last heartbeat counts, not the full minute.
    expect((await beat(agent, visitId, 60_000)).status).toBe(200);
    const row = await db.selectFrom("site_visits").selectAll().where("id", "=", visitId).executeTakeFirstOrThrow();
    expect(row.user_id).toBe(id);
    expect(row.active_ms).toBeGreaterThan(30_000);
    expect(row.active_ms).toBeLessThan(40_000);

    // Pretend the last heartbeat was a minute ago: the full amount is accepted.
    await db.updateTable("site_visits").set({ last_seen_at: new Date(Date.now() - 60_000) }).where("id", "=", visitId).execute();
    await beat(agent, visitId, 30_000);
    const after = await db.selectFrom("site_visits").select("active_ms").where("id", "=", visitId).executeTakeFirstOrThrow();
    expect(after.active_ms - row.active_ms).toBe(30_000);

    const analytics = await agent.get("/api/courses/foundations/analytics");
    expect(analytics.status).toBe(200);
    expect(analytics.body.time.totals.visits).toBe(1);
    expect(analytics.body.time.daily).toHaveLength(30);
    expect(analytics.body.time.daily.at(-1).minutes).toBeGreaterThan(1);
    expect(analytics.body.time.recentVisits[0].id).toBe(visitId);

    const dashboard = await agent.get("/api/courses/foundations/dashboard");
    expect(dashboard.body.stats.time.week).toHaveLength(7);
    expect(dashboard.body.stats.time.todayMinutes).toBeGreaterThan(1);
  });

  it("ignores another account's visit id and rejects bad heartbeats", async () => {
    const a = await signUp();
    const b = await signUp();
    const visitId = crypto.randomUUID();
    await beat(a.agent, visitId, 10_000);
    await db.updateTable("site_visits").set({ last_seen_at: new Date(Date.now() - 60_000) }).where("id", "=", visitId).execute();
    expect((await beat(b.agent, visitId, 10_000)).status).toBe(200);
    const row = await db.selectFrom("site_visits").select(["user_id", "active_ms"]).where("id", "=", visitId).executeTakeFirstOrThrow();
    expect(row).toEqual({ user_id: a.id, active_ms: 10_000 });

    expect((await beat(a.agent, visitId, 600_000)).status).toBe(400);
    expect((await beat(a.agent, "not-a-uuid", 1000)).status).toBe(400);
    expect((await request(app).post("/api/me/activity").set("Origin", ORIGIN).send({ visitId, activeMs: 1000 })).status).toBe(401);
  });
});
