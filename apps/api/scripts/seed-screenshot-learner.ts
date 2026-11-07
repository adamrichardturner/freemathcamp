/**
 * Seeds a learner with a few weeks of believable history, for App Store
 * screenshots taken against a LOCAL database (never production):
 *
 *   createdb fmc_shots && DATABASE_URL=…/fmc_shots pnpm migrate
 *   SHOTS_PASSWORD=… npx tsx --env-file=.env scripts/seed-screenshot-learner.ts
 *
 * The learner is "Alex" (shots@freemathcamp.test), 26 days into a streak, part
 * way through Foundations, with reviews due and a weekly league to show. The
 * password comes from SHOTS_PASSWORD so it never lands in git. Re-running
 * replaces the learner and the league's stand-ins.
 */
import { randomUUID } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { getGraph } from "@fmc/curriculum";
import { Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import { weekStart } from "../src/domain/leagues";

const url = process.env.DATABASE_URL ?? "";
if (!/@(127\.0\.0\.1|localhost)[:/]/.test(url)) throw new Error("Refusing to seed anything but a local database.");
const password = process.env.SHOTS_PASSWORD;
if (!password) throw new Error("Set SHOTS_PASSWORD.");

const EMAIL = "shots@freemathcamp.test";
const COURSE = "foundations";
const DAY = 86_400_000;
const STREAK = 26;
const RIVALS = ["maya_maths", "theo_solves", "priya_p", "sam_counts", "lena_learns", "noah_n", "ivy_integers", "jules_j", "omar_o", "zoe_zeroes", "kai_k"];
const RIVAL_XP = [1840, 1520, 1290, 980, 860, 720, 610, 480, 350, 210, 90];
const ALEX_XP = 1150;

// Deterministic randomness, so every run (and every device) shows the same numbers.
let s = 7;
const rand = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = new Kysely<any>({ dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString: url }) }) });
const graph = getGraph(COURSE)!;
const now = Date.now();
const today = new Date(now);
today.setUTCHours(0, 0, 0, 0);

async function main() {
  // Out with the old learner and stand-ins (cascades take their history with them).
  await db.deleteFrom("users").where((eb) => eb.or([eb("email", "=", EMAIL), eb("email", "like", "%@rivals.freemathcamp.test")])).execute();

  const id = randomUUID();
  await db
    .insertInto("users")
    .values({
      id,
      email: EMAIL,
      display_name: "Alex",
      username: "alex_learns",
      password_hash: await hash(password!, { memoryCost: 19_456, timeCost: 2, parallelism: 1 }),
      email_verified_at: new Date(now - 40 * DAY),
      onboarded_at: new Date(now - 40 * DAY),
      created_at: new Date(now - 40 * DAY),
      last_active_at: new Date(now),
      daily_goal: 15,
      timezone: "Europe/London",
      league_opt_in: true,
      league_tier: 2,
    })
    .execute();

  // Progress through the first stretch of the course: mastered, solid, shaky, then just started.
  const refs = graph.refs.slice(0, 23);
  const mastery = (i: number) => (i < 4 ? 0.9 + rand() * 0.08 : i < 12 ? 0.6 + rand() * 0.22 : i < 18 ? 0.35 + rand() * 0.25 : 0.1 + rand() * 0.2);
  const progress = refs.map((r, i) => {
    const m = mastery(i);
    const first = now - (STREAK + 6 - i) * DAY;
    const last = Math.min(now - 2 * 3_600_000, first + (3 + rand() * 6) * DAY);
    // Four reviews are due now; the rest come up over the next fortnight.
    const due = i % 5 === 1 ? now - (1 + rand() * 2) * DAY : now + (1 + rand() * 14) * DAY;
    const items = 12 + Math.round(rand() * 40);
    return {
      user_id: id,
      course_id: COURSE,
      exercise_id: r.exercise.id,
      mastery: m,
      struggle: Math.max(0, 0.6 - m) * 0.8,
      items_seen: items,
      clean_solves: Math.round(items * (0.45 + m * 0.45)),
      wrong_attempts: Math.round(items * (1 - m) * 0.5),
      reveals: Math.round(rand() * 2),
      hints_used: Math.round(rand() * 5),
      total_time_ms: items * (25_000 + Math.round(rand() * 30_000)),
      sessions_completed: 1 + Math.round(m * 4),
      ease: 2.2 + m * 0.4,
      interval_days: 1 + m * 10,
      review_count: Math.round(m * 4),
      due_at: new Date(due),
      first_practiced_at: new Date(first),
      last_practiced_at: new Date(last),
      lesson_viewed_at: new Date(first - 600_000),
      updated_at: new Date(last),
    };
  });
  await db.insertInto("exercise_progress").values(progress).execute();

  // A practice session or two on each of the last STREAK days; today has 10 of the 15-problem goal.
  const sessions: Record<string, unknown>[] = [];
  const results: Record<string, unknown>[] = [];
  for (let d = STREAK - 1; d >= 0; d--) {
    const count = d === 0 ? 10 : 8 + Math.round(rand() * 18);
    const ref = refs[Math.min(refs.length - 1, Math.floor(((STREAK - d) / STREAK) * refs.length))]!;
    const sessionId = randomUUID();
    const start = today.getTime() - d * DAY + (8 + rand() * 10) * 3_600_000;
    const startedAt = d === 0 ? Math.min(start, now - 40 * 60_000) : start;
    sessions.push({
      id: sessionId,
      user_id: id,
      course_id: COURSE,
      exercise_id: ref.exercise.id,
      mode: "learn",
      status: "completed",
      target_items: count,
      items: JSON.stringify([]),
      mastery_before: 0.4,
      mastery_after: 0.5,
      started_at: new Date(startedAt),
      completed_at: new Date(startedAt + count * 40_000),
    });
    for (let i = 0; i < count; i++) {
      const clean = rand() < 0.78;
      results.push({
        session_id: sessionId,
        item_index: i,
        user_id: id,
        course_id: COURSE,
        exercise_id: ref.exercise.id,
        level: 1 + Math.floor(rand() * 3),
        wrong_attempts: clean ? 0 : 1,
        revealed: false,
        hints_used: clean ? 0 : 1,
        time_ms: 20_000 + Math.round(rand() * 40_000),
        struggle: clean ? 0.05 : 0.4,
        clean_solve: clean,
        mastery_after: 0.5,
        resolved_at: new Date(startedAt + i * 40_000),
        xp: clean ? 10 : 5,
      });
    }
  }
  await db.insertInto("practice_sessions").values(sessions).execute();
  for (let i = 0; i < results.length; i += 500) await db.insertInto("item_results").values(results.slice(i, i + 500)).execute();

  // This week's league: Alex in fourth among a dozen.
  const week = weekStart();
  const cohort = randomUUID();
  await db.insertInto("league_cohorts").values({ id: cohort, week_start: week, tier: 2 }).execute();
  const members = [{ week_start: week, user_id: id, cohort_id: cohort, tier: 2, xp: ALEX_XP, xp_at: new Date(now - 3_600_000) }];
  for (const [i, username] of RIVALS.entries()) {
    const rid = randomUUID();
    await db
      .insertInto("users")
      .values({ id: rid, email: `${username}@rivals.freemathcamp.test`, display_name: username, username, league_opt_in: true, league_tier: 2, onboarded_at: new Date(now - 30 * DAY), email_verified_at: new Date(now - 30 * DAY) })
      .execute();
    members.push({ week_start: week, user_id: rid, cohort_id: cohort, tier: 2, xp: RIVAL_XP[i]!, xp_at: new Date(now - (i + 2) * 3_600_000) });
  }
  await db.insertInto("league_members").values(members).execute();

  const { rows } = await sql<{ n: number }>`select count(*)::int as n from item_results where user_id = ${id}`.execute(db);
  console.log(`Seeded Alex: ${progress.length} lessons, ${rows[0]!.n} problems over ${STREAK} days, league week ${week}.`);
  await db.destroy();
}

main().catch(async (e) => {
  console.error(e);
  await db.destroy();
  process.exit(1);
});
