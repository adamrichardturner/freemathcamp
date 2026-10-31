import { Effect, Layer } from "effect";
import { sql } from "kysely";
import {
  AnalyticsRepository,
  EmailTokenRepository,
  PracticeRepository,
  ProgressRepository,
  SessionRepository,
  UserRepository,
  type DailyActivity,
} from "../../application/ports";
import { Conflict, DatabaseError } from "../../domain/errors";
import { Database } from "../db/database";

const UNIQUE_VIOLATION = "23505";

/** Builds a repository whose methods close over the Kysely instance. */
const repo = <Tag, S>(tag: import("effect").Context.Tag<Tag, S>, make: (run: <A>(f: (db: import("kysely").Kysely<import("../db/schema").DB>) => Promise<A>) => Effect.Effect<A, DatabaseError>) => S) =>
  Layer.effect(
    tag,
    Effect.map(Database, (db) => make((f) => Effect.tryPromise({ try: () => f(db), catch: (cause) => new DatabaseError({ cause }) }))),
  );

export const UserRepositoryLive = repo(UserRepository, (run) => ({
  create: ({ email, displayName, passwordHash }) =>
    run((db) => db.insertInto("users").values({ email, display_name: displayName, password_hash: passwordHash }).returningAll().executeTakeFirstOrThrow()).pipe(
      Effect.catchIf(
        (e) => (e.cause as { code?: string })?.code === UNIQUE_VIOLATION,
        () => Effect.fail(new Conflict({ message: "An account with that email already exists." })),
      ),
    ),
  findByEmail: (email) => run((db) => db.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst()),
  findById: (id) => run((db) => db.selectFrom("users").selectAll().where("id", "=", id).executeTakeFirst()),
  touch: (id) => run((db) => db.updateTable("users").set({ last_active_at: new Date() }).where("id", "=", id).execute()).pipe(Effect.asVoid),
  updateDisplayName: (id, displayName) =>
    run((db) => db.updateTable("users").set({ display_name: displayName }).where("id", "=", id).returningAll().executeTakeFirstOrThrow()),
  findByOAuth: (provider, providerUserId) =>
    run((db) =>
      db
        .selectFrom("oauth_accounts")
        .innerJoin("users", "users.id", "oauth_accounts.user_id")
        .selectAll("users")
        .where("oauth_accounts.provider", "=", provider)
        .where("oauth_accounts.provider_user_id", "=", providerUserId)
        .executeTakeFirst(),
    ),
  upsertOAuthUser: ({ provider, providerUserId, email, displayName, avatarUrl }) =>
    run((db) =>
      db.transaction().execute(async (trx) => {
        // Only reached with a provider-verified email, which proves ownership.
        let existing = await trx.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst();
        if (existing && !existing.email_verified_at) {
          // An unverified password account may have been pre-registered by someone else
          // with this email. The real owner just proved it, so revoke that access.
          await trx.deleteFrom("sessions").where("user_id", "=", existing.id).execute();
          existing = await trx
            .updateTable("users")
            .set({ password_hash: null, email_verified_at: new Date() })
            .where("id", "=", existing.id)
            .returningAll()
            .executeTakeFirstOrThrow();
        }
        const user =
          existing ??
          (await trx
            .insertInto("users")
            .values({ email, display_name: displayName.slice(0, 60), password_hash: null, avatar_url: avatarUrl, email_verified_at: new Date() })
            .returningAll()
            .executeTakeFirstOrThrow());
        await trx
          .insertInto("oauth_accounts")
          .values({ provider, provider_user_id: providerUserId, user_id: user.id, email })
          .onConflict((oc) => oc.doNothing())
          .execute();
        if (existing && !existing.avatar_url && avatarUrl) await trx.updateTable("users").set({ avatar_url: avatarUrl }).where("id", "=", user.id).execute();
        return user;
      }),
    ),
  markEmailVerified: (id) =>
    run((db) =>
      db
        .updateTable("users")
        .set((eb) => ({ email_verified_at: eb.fn.coalesce("email_verified_at", sql<Date>`now()`) }))
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow(),
    ),
}));

export const EmailTokenRepositoryLive = repo(EmailTokenRepository, (run) => ({
  create: ({ id, userId, expiresAt }) =>
    run((db) => db.insertInto("email_verification_tokens").values({ id, user_id: userId, expires_at: expiresAt }).execute()).pipe(Effect.asVoid),
  consume: (id) =>
    run((db) =>
      db.deleteFrom("email_verification_tokens").where("id", "=", id).where("expires_at", ">", new Date()).returning("user_id").executeTakeFirst(),
    ).pipe(Effect.map((r) => r?.user_id)),
  countSince: (userId, since) =>
    run((db) =>
      db
        .selectFrom("email_verification_tokens")
        .select((eb) => eb.fn.countAll<string>().as("n"))
        .where("user_id", "=", userId)
        .where("created_at", ">=", since)
        .executeTakeFirstOrThrow(),
    ).pipe(Effect.map((r) => Number(r.n))),
}));

export const SessionRepositoryLive = repo(SessionRepository, (run) => ({
  create: ({ id, userId, expiresAt, userAgent, ip }) =>
    run((db) => db.insertInto("sessions").values({ id, user_id: userId, expires_at: expiresAt, user_agent: userAgent, ip }).execute()).pipe(Effect.asVoid),
  find: (id) =>
    run((db) =>
      db
        .selectFrom("sessions")
        .select(["id", "user_id", "expires_at"])
        .where("id", "=", id)
        .where("expires_at", ">", new Date())
        .executeTakeFirst(),
    ).pipe(Effect.map((s) => s && { id: s.id, userId: s.user_id, expiresAt: s.expires_at })),
  extend: (id, expiresAt) =>
    run((db) => db.updateTable("sessions").set({ expires_at: expiresAt, last_seen_at: new Date() }).where("id", "=", id).execute()).pipe(Effect.asVoid),
  delete: (id) => run((db) => db.deleteFrom("sessions").where("id", "=", id).execute()).pipe(Effect.asVoid),
  deleteExpired: () =>
    run((db) => db.deleteFrom("sessions").where("expires_at", "<", new Date()).executeTakeFirst()).pipe(Effect.map((r) => Number(r.numDeletedRows))),
}));

export const ProgressRepositoryLive = repo(ProgressRepository, (run) => ({
  listForCourse: (userId, courseId) =>
    run((db) => db.selectFrom("exercise_progress").selectAll().where("user_id", "=", userId).where("course_id", "=", courseId).execute()),
  find: (userId, courseId, exerciseId) =>
    run((db) =>
      db
        .selectFrom("exercise_progress")
        .selectAll()
        .where("user_id", "=", userId)
        .where("course_id", "=", courseId)
        .where("exercise_id", "=", exerciseId)
        .executeTakeFirst(),
    ),
  ensure: (userId, courseId, exerciseId) =>
    run(async (db) => {
      await db
        .insertInto("exercise_progress")
        .values({
          user_id: userId,
          course_id: courseId,
          exercise_id: exerciseId,
          mastery: 0.15,
          struggle: 0,
          items_seen: 0,
          clean_solves: 0,
          wrong_attempts: 0,
          reveals: 0,
          hints_used: 0,
          total_time_ms: 0,
          sessions_completed: 0,
          ease: 2.5,
          interval_days: 0,
          review_count: 0,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();
      return db
        .selectFrom("exercise_progress")
        .selectAll()
        .where("user_id", "=", userId)
        .where("course_id", "=", courseId)
        .where("exercise_id", "=", exerciseId)
        .executeTakeFirstOrThrow();
    }),
  update: (userId, courseId, exerciseId, patch) =>
    run((db) =>
      db
        .updateTable("exercise_progress")
        .set({ ...patch, updated_at: new Date() })
        .where("user_id", "=", userId)
        .where("course_id", "=", courseId)
        .where("exercise_id", "=", exerciseId)
        .returningAll()
        .executeTakeFirstOrThrow(),
    ),
}));

export const PracticeRepositoryLive = repo(PracticeRepository, (run) => ({
  createSession: ({ userId, courseId, exerciseId, mode, targetItems, firstItem, masteryBefore }) =>
    run((db) =>
      db
        .insertInto("practice_sessions")
        .values({
          user_id: userId,
          course_id: courseId,
          exercise_id: exerciseId,
          mode,
          status: "active",
          target_items: targetItems,
          items: JSON.stringify([firstItem]),
          mastery_before: masteryBefore,
        })
        .returningAll()
        .executeTakeFirstOrThrow(),
    ),
  findSession: (id, userId) =>
    run((db) => db.selectFrom("practice_sessions").selectAll().where("id", "=", id).where("user_id", "=", userId).executeTakeFirst()),
  appendItem: (id, item) =>
    run((db) =>
      db
        .updateTable("practice_sessions")
        .set({ items: sql`items || ${JSON.stringify([item])}::jsonb` as never })
        .where("id", "=", id)
        .execute(),
    ).pipe(Effect.asVoid),
  completeSession: (id, masteryAfter) =>
    run((db) =>
      db
        .updateTable("practice_sessions")
        .set({ status: "completed", completed_at: new Date(), mastery_after: masteryAfter })
        .where("id", "=", id)
        .where("status", "=", "active")
        .execute(),
    ).pipe(Effect.asVoid),
  abandonActive: (userId, exerciseId) =>
    run((db) =>
      db
        .updateTable("practice_sessions")
        .set({ status: "abandoned" })
        .where("user_id", "=", userId)
        .where("exercise_id", "=", exerciseId)
        .where("status", "=", "active")
        .execute(),
    ).pipe(Effect.asVoid),
  recordAttempt: ({ sessionId, userId, itemIndex, answer, correct, timeMs }) =>
    run((db) =>
      db.insertInto("attempts").values({ session_id: sessionId, user_id: userId, item_index: itemIndex, answer, correct, time_ms: timeMs }).execute(),
    ).pipe(Effect.asVoid),
  wrongAttemptsFor: (sessionId, itemIndex) =>
    run((db) =>
      db
        .selectFrom("attempts")
        .select((eb) => eb.fn.countAll<string>().as("n"))
        .where("session_id", "=", sessionId)
        .where("item_index", "=", itemIndex)
        .where("correct", "=", false)
        .executeTakeFirstOrThrow(),
    ).pipe(Effect.map((r) => Number(r.n))),
  recordItemResult: (r) =>
    run((db) =>
      db
        .insertInto("item_results")
        .values({
          session_id: r.sessionId,
          item_index: r.itemIndex,
          user_id: r.userId,
          course_id: r.courseId,
          exercise_id: r.exerciseId,
          level: r.level,
          wrong_attempts: r.wrongAttempts,
          revealed: r.revealed,
          hints_used: r.hintsUsed,
          time_ms: r.timeMs,
          struggle: r.struggle,
          clean_solve: r.cleanSolve,
          mastery_after: r.masteryAfter,
        })
        .onConflict((oc) => oc.doNothing())
        .returning("item_index")
        .executeTakeFirst(),
    ).pipe(Effect.map((row) => row !== undefined)),
  itemResults: (sessionId) =>
    run((db) => db.selectFrom("item_results").selectAll().where("session_id", "=", sessionId).orderBy("item_index").execute()),
  recentSessions: (userId, courseId, limit, exerciseId) =>
    run((db) => {
      let q = db
        .selectFrom("practice_sessions")
        .selectAll()
        .where("user_id", "=", userId)
        .where("course_id", "=", courseId)
        .where("status", "=", "completed");
      if (exerciseId) q = q.where("exercise_id", "=", exerciseId);
      return q.orderBy("completed_at", "desc").limit(limit).execute();
    }),
}));

export const AnalyticsRepositoryLive = repo(AnalyticsRepository, (run) => ({
  dailyActivity: (userId, courseId, days) =>
    run((db) =>
      db
        .selectFrom("item_results")
        .select([
          sql<string>`to_char(date_trunc('day', resolved_at), 'YYYY-MM-DD')`.as("day"),
          sql<number>`count(*)::int`.as("problems"),
          sql<number>`count(*) filter (where clean_solve)::int`.as("cleanSolves"),
          sql<number>`sum(time_ms)::bigint`.as("timeMs"),
          sql<number>`avg(struggle)::float`.as("meanStruggle"),
        ])
        .where("user_id", "=", userId)
        .where("course_id", "=", courseId)
        .where("resolved_at", ">=", sql<Date>`now() - make_interval(days => ${days})`)
        .groupBy(sql`1`)
        .orderBy(sql`1`)
        .execute(),
    ).pipe(Effect.map((rows) => rows as DailyActivity[])),
  activeDays: (userId) =>
    run((db) =>
      db
        .selectFrom("item_results")
        .select(sql<string>`to_char(date_trunc('day', resolved_at), 'YYYY-MM-DD')`.as("day"))
        .distinct()
        .where("user_id", "=", userId)
        .orderBy("day", "desc")
        .limit(400)
        .execute(),
    ).pipe(Effect.map((rows) => rows.map((r) => r.day))),
  levelBreakdown: (userId, courseId) =>
    run((db) =>
      db
        .selectFrom("item_results")
        .select(["level", sql<number>`count(*)::int`.as("problems"), sql<number>`count(*) filter (where clean_solve)::int`.as("cleanSolves")])
        .where("user_id", "=", userId)
        .where("course_id", "=", courseId)
        .groupBy("level")
        .orderBy("level")
        .execute(),
    ),
  masteryTimeline: (userId, courseId, exerciseId) =>
    run((db) =>
      db
        .selectFrom("item_results")
        .select(["resolved_at as at", "mastery_after as mastery", "struggle"])
        .where("user_id", "=", userId)
        .where("course_id", "=", courseId)
        .where("exercise_id", "=", exerciseId)
        .orderBy("resolved_at")
        .limit(200)
        .execute(),
    ),
}));

export const RepositoriesLive = Layer.mergeAll(
  UserRepositoryLive,
  EmailTokenRepositoryLive,
  SessionRepositoryLive,
  ProgressRepositoryLive,
  PracticeRepositoryLive,
  AnalyticsRepositoryLive,
);
