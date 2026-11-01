import { generateProblem, getExercise, type Answer } from "@fmc/curriculum";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { settleFinishedWeeks } from "../src/application/leagues";
import { PROMOTION_MIN_XP, previousWeek, settle, weekStart, xpFor, zones } from "../src/domain/leagues";
import { createApp } from "../src/http/app";
import { makeRuntime, type AppRuntime } from "../src/http/runtime";
import { createKysely } from "../src/infrastructure/db/database";
import { handle } from "./helpers";

describe("league scoring", () => {
  it("rewards harder problems and first-try answers, and nothing for a reveal", () => {
    expect([1, 2, 3].map((level) => xpFor({ level, wrongAttempts: 0, hintsUsed: 0, revealed: false }))).toEqual([10, 15, 20]);
    expect(xpFor({ level: 2, wrongAttempts: 1, hintsUsed: 0, revealed: false })).toBe(8);
    expect(xpFor({ level: 3, wrongAttempts: 4, hintsUsed: 0, revealed: false })).toBe(5);
    expect(xpFor({ level: 3, wrongAttempts: 0, hintsUsed: 2, revealed: false })).toBe(15);
    expect(xpFor({ level: 3, wrongAttempts: 0, hintsUsed: 0, revealed: true })).toBe(0);
  });

  it("starts weeks on Monday, UTC", () => {
    expect(weekStart(new Date("2026-11-01T23:59:00Z"))).toBe("2026-10-26"); // a Sunday
    expect(weekStart(new Date("2026-11-02T00:00:00Z"))).toBe("2026-11-02");
    expect(previousWeek("2026-11-02")).toBe("2026-10-26");
  });

  it("promotes the top fifth (with enough XP) and demotes the bottom fifth", () => {
    const ranked = [300, 200, 120, 90, 50, 40, 30, 20, 10, 5].map((xp, i) => ({ id: i, xp }));
    const out = settle(ranked, 2);
    expect(out.map((o) => o.result)).toEqual(["promoted", "promoted", "stayed", "stayed", "stayed", "stayed", "stayed", "stayed", "demoted", "demoted"]);
    expect(out.map((o) => o.nextTier)).toEqual([3, 3, 2, 2, 2, 2, 2, 2, 1, 1]);
    // Top of a quiet cohort stays put; Bronze can't demote; small cohorts don't demote; the top tier can't promote.
    expect(settle([{ xp: PROMOTION_MIN_XP - 1 }], 0)[0]!.result).toBe("stayed");
    expect(zones(10, 0).demote).toBe(0);
    expect(zones(4, 3).demote).toBe(0);
    expect(zones(30, 5).promote).toBe(0);
  });
});

/** Usernames and leagues end to end. Needs DATABASE_URL (skipped otherwise). */
const ORIGIN = "http://localhost:3000";
const enabled = !!process.env.DATABASE_URL;
const PASSWORD = "correct-horse-42";
/** Each sign-up vouches for its own client IP, so the per-network sign-up limit isn't hit. */
const PROXY_SECRET = "test-proxy-secret";
let ipCounter = 0;
const correctInput = (a: Answer) => (a.kind === "choice" ? `${a.correct}` : a.kind === "number" ? `${a.value}` : a.values.join(", "));

describe.skipIf(!enabled)("usernames and leagues", () => {
  let runtime: AppRuntime;
  let app: ReturnType<typeof createApp>;
  let db: ReturnType<typeof createKysely>;
  beforeAll(() => {
    runtime = makeRuntime();
    app = createApp(runtime, { webOrigin: ORIGIN, secureCookies: false, proxySecret: PROXY_SECRET });
    db = createKysely(process.env.DATABASE_URL!);
  });
  afterAll(async () => {
    await db.destroy();
    await runtime.dispose();
  });

  const signUp = async (username = handle()) => {
    const agent = request.agent(app);
    const email = `league+${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;
    const res = await agent
      .post("/api/auth/register")
      .set("Origin", ORIGIN)
      .set("x-fmc-client-ip", `198.51.100.${++ipCounter}`)
      .set("x-fmc-proxy-secret", PROXY_SECRET)
      .send({ email, password: PASSWORD, displayName: "Private Name", username });
    await db.updateTable("users").set({ email_verified_at: new Date() }).where("email", "=", email).execute();
    const send = (method: "post" | "patch" | "put", path: string, body: object = {}) => agent[method](path).set("Origin", ORIGIN).send(body);
    return { agent, email, username, res, send, id: res.body.user?.id as string };
  };

  const practise = async (send: Awaited<ReturnType<typeof signUp>>["send"]) => {
    const ref = getExercise("foundations", "place-value")!;
    const start = await send("post", "/api/practice", { courseId: "foundations", exerciseId: "place-value" });
    let item = start.body.item;
    let xp = 0;
    for (let i = 0; i < start.body.targetItems; i++) {
      const problem = generateProblem(ref, item.seed, item.level);
      const res = await send("post", `/api/practice/${start.body.sessionId}/attempts`, { index: i, answer: correctInput(problem.answer), timeMs: 8000, hintsUsed: 0 });
      xp += res.body.xp;
      item = res.body.next;
    }
    return xp;
  };

  it("asks for a unique username at sign-up, ignoring letter case", async () => {
    const first = await signUp(handle("Ada"));
    expect(first.res.status).toBe(201);
    expect(first.res.body.user).toMatchObject({ username: first.username, leagueOptIn: true });
    expect((await signUp(first.username.toUpperCase())).res.status).toBe(409);
    expect((await signUp("admin")).res.status).toBe(400);
    expect((await signUp("9lives")).res.status).toBe(400);
    expect((await signUp("ab")).res.status).toBe(400);

    const check = (u: string) => request(app).get(`/api/auth/username-available?username=${u}`);
    expect((await check(first.username.toLowerCase())).body).toMatchObject({ available: false });
    expect((await check(handle("free"))).body).toEqual({ available: true, reason: null });
    // Your own name counts as available to you.
    expect((await first.agent.get(`/api/auth/username-available?username=${first.username}`)).body.available).toBe(true);
  });

  it("lets accounts without a username choose one later", async () => {
    const { send, id } = await signUp();
    await db.updateTable("users").set({ username: null }).where("id", "=", id).execute();
    expect((await send("put", "/api/me/league", { optIn: true })).status).toBe(400);
    const taken = await signUp();
    expect((await send("patch", "/api/me/username", { username: taken.username.toLowerCase() })).status).toBe(409);
    const name = handle("New");
    expect((await send("patch", "/api/me/username", { username: name })).body.user.username).toBe(name);
  });

  it("scores practice into a weekly cohort that shows usernames only", async () => {
    const a = await signUp();
    const b = await signUp();
    // Everyone starts in the leagues, and is placed on their first solved problem.
    expect((await a.agent.get("/api/leagues/me")).body).toMatchObject({ optedIn: true, cohort: null, tier: { index: 0, name: "Bronze" } });
    expect((await a.send("put", "/api/me/league", { optIn: false })).body.user.leagueOptIn).toBe(false);

    // XP earned while out still counts for the week on (re)joining.
    const earned = await practise(a.send);
    expect((await a.agent.get("/api/leagues/me")).body).toMatchObject({ optedIn: false, cohort: null });
    expect(earned).toBeGreaterThan(0);
    expect((await a.send("put", "/api/me/league", { optIn: true })).body.user.leagueOptIn).toBe(true);
    await practise(b.send);
    await practise(b.send);

    const league = (await a.agent.get("/api/leagues/me")).body;
    expect(league.lifetimeXp).toBe(earned);
    expect(league.cohort.xp).toBe(earned);
    const me = league.cohort.members.find((m: { you: boolean }) => m.you);
    expect(me).toEqual({ rank: league.cohort.rank, username: a.username, xp: earned, you: true });
    const other = league.cohort.members.find((m: { username: string }) => m.username === b.username);
    if (other) expect(Object.keys(other).sort()).toEqual(["rank", "username", "xp", "you"]);
    expect(JSON.stringify(league)).not.toContain("Private Name");
    expect(JSON.stringify(league)).not.toContain(b.email);

    // Opting out takes you off this week's table.
    await a.send("put", "/api/me/league", { optIn: false });
    expect((await a.agent.get("/api/leagues/me")).body).toMatchObject({ optedIn: false, cohort: null, lifetimeXp: earned });
  });

  it("settles a finished week: promotions, demotions and a notice", async () => {
    const players = await Promise.all(Array.from({ length: 6 }, () => signUp()));
    const lastWeek = previousWeek(weekStart());
    const cohort = await db.insertInto("league_cohorts").values({ week_start: lastWeek, tier: 1 }).returning("id").executeTakeFirstOrThrow();
    const xps = [300, 200, 100, 50, 20, 10];
    await db
      .insertInto("league_members")
      .values(players.map((p, i) => ({ week_start: lastWeek, user_id: p.id, cohort_id: cohort.id, tier: 1, xp: xps[i]! })))
      .execute();
    await db.updateTable("users").set({ league_tier: 1, league_opt_in: true }).where("id", "in", players.map((p) => p.id)).execute();

    expect(await runtime.runPromise(settleFinishedWeeks)).toBeGreaterThan(0);
    const tiers = await db.selectFrom("users").select(["id", "league_tier"]).where("id", "in", players.map((p) => p.id)).execute();
    expect(players.map((p) => tiers.find((t) => t.id === p.id)!.league_tier)).toEqual([2, 2, 1, 1, 1, 0]);

    const top = (await players[0]!.agent.get("/api/leagues/me")).body;
    expect(top.tier).toEqual({ index: 2, name: "Gold" });
    expect(top.lastWeek).toMatchObject({ weekStart: lastWeek, result: "promoted", rank: 1, tier: { name: "Silver" } });
    const notes = (await players[0]!.agent.get("/api/me/notifications")).body.items as { kind: string; title: string }[];
    expect(notes.find((n) => n.kind === "league_result")?.title).toBe("Promoted to the Gold League");
    // Settling again is a no-op.
    const again = await db.selectFrom("league_cohorts").select("finalized_at").where("id", "=", cohort.id).executeTakeFirstOrThrow();
    expect(again.finalized_at).not.toBeNull();
  });
});
