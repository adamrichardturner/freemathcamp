import { Effect, Layer } from "effect";
import { sql, type SelectQueryBuilder } from "kysely";
import {
  AccountRepository,
  AdminRepository,
  AnalyticsRepository,
  LeagueRepository,
  type LeagueMembership,
  EmailTokenRepository,
  PasswordResetTokenRepository,
  JobLeaseRepository,
  NotificationRepository,
  PushSubscriptionRepository,
  ReminderRepository,
  type NotificationFilter,
  PracticeRepository,
  ProgressRepository,
  SessionRepository,
  UserRepository,
  VisitRepository,
  type DailyActivity,
  type TimeUnit,
} from "../../application/ports";
import { Conflict, DatabaseError } from "../../domain/errors";
import { Database } from "../db/database";
import type { DB, LeagueMembersTable } from "../db/schema";
import { COHORT_SIZE } from "../../domain/leagues";
import type { AdminUserRow } from "../../application/ports";

const UNIQUE_VIOLATION = "23505";

/** Builds a repository whose methods close over the Kysely instance. */
const repo = <Tag, S>(tag: import("effect").Context.Tag<Tag, S>, make: (run: <A>(f: (db: import("kysely").Kysely<import("../db/schema").DB>) => Promise<A>) => Effect.Effect<A, DatabaseError>) => S) =>
  Layer.effect(
    tag,
    Effect.map(Database, (db) => make((f) => Effect.tryPromise({ try: () => f(db), catch: (cause) => new DatabaseError({ cause }) }))),
  );

export const UserRepositoryLive = repo(UserRepository, (run) => ({
  create: ({ email, displayName, username, passwordHash }) =>
    run((db) => db.insertInto("users").values({ email, display_name: displayName, username, password_hash: passwordHash }).returningAll().executeTakeFirstOrThrow()).pipe(
      Effect.catchIf(
        (e) => (e.cause as { code?: string })?.code === UNIQUE_VIOLATION,
        (e) =>
          Effect.fail(
            new Conflict({ message: (e.cause as { constraint?: string })?.constraint?.includes("username") ? "That username is taken." : "An account with that email already exists." }),
          ),
      ),
    ),
  setUsername: (id, username) =>
    run((db) => db.updateTable("users").set({ username }).where("id", "=", id).returningAll().executeTakeFirstOrThrow()).pipe(
      Effect.catchIf(
        (e) => (e.cause as { code?: string })?.code === UNIQUE_VIOLATION,
        () => Effect.fail(new Conflict({ message: "That username is taken." })),
      ),
    ),
  usernameTaken: (username, exceptUserId) =>
    run((db) => {
      // citext makes this comparison case-insensitive, matching the unique index.
      let q = db.selectFrom("users").select("id").where("username", "=", username);
      if (exceptUserId) q = q.where("id", "!=", exceptUserId);
      return q.executeTakeFirst();
    }).pipe(Effect.map((r) => !!r)),
  findByEmail: (email) => run((db) => db.selectFrom("users").selectAll().where("email", "=", email).executeTakeFirst()),
  findById: (id) => run((db) => db.selectFrom("users").selectAll().where("id", "=", id).executeTakeFirst()),
  touch: (id) => run((db) => db.updateTable("users").set({ last_active_at: new Date() }).where("id", "=", id).execute()).pipe(Effect.asVoid),
  recordLoginIp: (id, ip) =>
    run((db) =>
      // The self-join reads the row as it was before this update, so the swap is one statement.
      db
        .updateTable("users")
        .from("users as prev")
        .set({ last_login_ip: ip })
        .whereRef("users.id", "=", "prev.id")
        .where("users.id", "=", id)
        .returning("prev.last_login_ip as previous")
        .executeTakeFirst(),
    ).pipe(Effect.map((r) => r?.previous ?? null)),
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
  setOAuthRefreshToken: (provider, providerUserId, token) =>
    run((db) =>
      db.updateTable("oauth_accounts").set({ refresh_token: token }).where("provider", "=", provider).where("provider_user_id", "=", providerUserId).execute(),
    ).pipe(Effect.asVoid),
  oauthRefreshTokens: (userId, provider) =>
    run((db) =>
      db.selectFrom("oauth_accounts").select("refresh_token").where("user_id", "=", userId).where("provider", "=", provider).where("refresh_token", "is not", null).execute(),
    ).pipe(Effect.map((rows) => rows.map((r) => r.refresh_token!))),
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
  unsubscribeReminderEmails: (token) =>
    run((db) =>
      db.updateTable("users").set({ notify_email_reminders: false }).where("email_unsubscribe_token", "=", token).returningAll().executeTakeFirst(),
    ),
  updatePreferences: (id, { dailyGoal, learningMode, timezone, notifyReminders, notifyProgress, notifyEmailReminders, leagueOptIn }) =>
    run((db) =>
      db
        .updateTable("users")
        .set({
          ...(dailyGoal !== undefined && { daily_goal: dailyGoal }),
          ...(learningMode && { learning_mode: learningMode }),
          ...(timezone && { timezone }),
          ...(notifyReminders !== undefined && { notify_reminders: notifyReminders }),
          ...(notifyProgress !== undefined && { notify_progress: notifyProgress }),
          ...(notifyEmailReminders !== undefined && { notify_email_reminders: notifyEmailReminders }),
          ...(leagueOptIn !== undefined && { league_opt_in: leagueOptIn }),
        })
        .where("id", "=", id)
        .returningAll()
        .executeTakeFirstOrThrow(),
    ),
  markOnboarded: (id) =>
    run((db) => db.updateTable("users").set({ onboarded_at: new Date() }).where("id", "=", id).returningAll().executeTakeFirstOrThrow()),
  updatePasswordHash: (id, passwordHash) =>
    run((db) => db.updateTable("users").set({ password_hash: passwordHash }).where("id", "=", id).returningAll().executeTakeFirstOrThrow()),
  delete: (id) => run((db) => db.deleteFrom("users").where("id", "=", id).execute()).pipe(Effect.asVoid),
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

export const PasswordResetTokenRepositoryLive = repo(PasswordResetTokenRepository, (run) => ({
  create: ({ id, userId, expiresAt }) =>
    run((db) => db.insertInto("password_reset_tokens").values({ id, user_id: userId, expires_at: expiresAt }).execute()).pipe(Effect.asVoid),
  find: (id) =>
    run((db) => db.selectFrom("password_reset_tokens").select(["user_id", "expires_at"]).where("id", "=", id).executeTakeFirst()).pipe(
      Effect.map((r) => r && { userId: r.user_id, expiresAt: r.expires_at }),
    ),
  consume: (id) =>
    run((db) => db.deleteFrom("password_reset_tokens").where("id", "=", id).where("expires_at", ">", new Date()).returning("user_id").executeTakeFirst()).pipe(
      Effect.map((r) => r?.user_id),
    ),
  countSince: (userId, since) =>
    run((db) =>
      db
        .selectFrom("password_reset_tokens")
        .select((eb) => eb.fn.countAll<string>().as("n"))
        .where("user_id", "=", userId)
        .where("created_at", ">=", since)
        .executeTakeFirstOrThrow(),
    ).pipe(Effect.map((r) => Number(r.n))),
  deleteForUser: (userId) => run((db) => db.deleteFrom("password_reset_tokens").where("user_id", "=", userId).execute()).pipe(Effect.asVoid),
  deleteExpired: () =>
    run((db) => db.deleteFrom("password_reset_tokens").where("expires_at", "<", new Date(Date.now() - 86_400_000)).executeTakeFirst()).pipe(
      Effect.map((r) => Number(r.numDeletedRows)),
    ),
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
  countActive: (userId) =>
    run((db) =>
      db
        .selectFrom("sessions")
        .select((eb) => eb.fn.countAll<string>().as("n"))
        .where("user_id", "=", userId)
        .where("expires_at", ">", new Date())
        .executeTakeFirstOrThrow(),
    ).pipe(Effect.map((r) => Number(r.n))),
  deleteOthers: (userId, keepId) =>
    run((db) => db.deleteFrom("sessions").where("user_id", "=", userId).where("id", "!=", keepId).executeTakeFirst()).pipe(
      Effect.map((r) => Number(r.numDeletedRows)),
    ),
  deleteAll: (userId) =>
    run((db) => db.deleteFrom("sessions").where("user_id", "=", userId).executeTakeFirst()).pipe(Effect.map((r) => Number(r.numDeletedRows))),
}));

export const AccountRepositoryLive = repo(AccountRepository, (run) => ({
  recordEvent: (userId, kind) => run((db) => db.insertInto("account_events").values({ user_id: userId, kind }).execute()).pipe(Effect.asVoid),
  eventsSince: (userId, kind, since) =>
    run((db) =>
      db
        .selectFrom("account_events")
        .select("created_at")
        .where("user_id", "=", userId)
        .where("kind", "=", kind)
        .where("created_at", ">=", since)
        .orderBy("created_at")
        .execute(),
    ).pipe(Effect.map((rows) => rows.map((r) => r.created_at))),
  linkedProviders: (userId) =>
    run((db) => db.selectFrom("oauth_accounts").select("provider").where("user_id", "=", userId).execute()).pipe(Effect.map((r) => r.map((x) => x.provider))),
  resetCourse: (userId, courseId) =>
    run((db) =>
      db.transaction().execute(async (trx) => {
        // Item results and attempts cascade from practice sessions.
        await trx.deleteFrom("practice_sessions").where("user_id", "=", userId).where("course_id", "=", courseId).execute();
        await trx.deleteFrom("exercise_progress").where("user_id", "=", userId).where("course_id", "=", courseId).execute();
      }),
    ),
  exportData: (userId) =>
    run(async (db) => {
      const [account, linkedAccounts, progress, sessions, results, attempts, events, notifications, pushDevices, visits] = await Promise.all([
        db.selectFrom("users").select(["id", "email", "display_name", "avatar_url", "email_verified_at", "daily_goal", "learning_mode", "onboarded_at", "timezone", "notify_reminders", "notify_progress", "notify_email_reminders", "created_at", "last_active_at"]).where("id", "=", userId).executeTakeFirst(),
        db.selectFrom("oauth_accounts").select(["provider", "email", "created_at"]).where("user_id", "=", userId).execute(),
        db.selectFrom("exercise_progress").selectAll().where("user_id", "=", userId).execute(),
        db.selectFrom("practice_sessions").selectAll().where("user_id", "=", userId).orderBy("started_at").execute(),
        db.selectFrom("item_results").selectAll().where("user_id", "=", userId).orderBy("resolved_at").execute(),
        db.selectFrom("attempts").select(["session_id", "item_index", "answer", "correct", "time_ms", "created_at"]).where("user_id", "=", userId).orderBy("created_at").execute(),
        db.selectFrom("account_events").select(["kind", "created_at"]).where("user_id", "=", userId).orderBy("created_at").execute(),
        db
          .selectFrom("notifications")
          .select(["kind", "category", "title", "body", "href", "created_at", "seen_at", "read_at", "kept_at", "dismissed_at"])
          .where("user_id", "=", userId)
          .orderBy("created_at")
          .execute(),
        db.selectFrom("push_subscriptions").select(["platform", "user_agent", "created_at", "last_success_at"]).where("user_id", "=", userId).execute(),
        db.selectFrom("site_visits").select(["started_at", "last_seen_at", "active_ms"]).where("user_id", "=", userId).orderBy("started_at").execute(),
      ]);
      return {
        exportedAt: new Date().toISOString(),
        account,
        linkedAccounts,
        progress,
        practiceSessions: sessions,
        problemResults: results,
        attempts,
        accountEvents: events,
        notifications,
        pushDevices,
        siteVisits: visits,
      };
    }),
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
          xp: r.xp,
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

const notificationFilter = <QB extends SelectQueryBuilder<DB, "notifications", object>>(qb: QB, filter: NotificationFilter): QB =>
  (filter === "unread" ? qb.where("read_at", "is", null) : filter === "kept" ? qb.where("kept_at", "is not", null) : qb) as QB;

export const NotificationRepositoryLive = repo(NotificationRepository, (run) => ({
  create: (userId, draft) =>
    run((db) =>
      db
        .insertInto("notifications")
        .values({
          user_id: userId,
          kind: draft.kind,
          category: draft.category,
          title: draft.title.slice(0, 160),
          body: draft.body,
          href: draft.href ?? null,
          data: JSON.stringify(draft.data ?? {}),
          dedupe_key: draft.dedupeKey ?? null,
          email_status: draft.email ? "pending" : "skipped",
        })
        .onConflict((oc) => oc.columns(["user_id", "dedupe_key"]).where("dedupe_key", "is not", null).doNothing())
        .returningAll()
        .executeTakeFirst(),
    ),
  list: (userId, { filter, limit, before }) =>
    run((db) => {
      let qb = db.selectFrom("notifications").selectAll().where("user_id", "=", userId).where("dismissed_at", "is", null);
      qb = notificationFilter(qb, filter);
      if (before) qb = qb.where((eb) => eb.or([eb("created_at", "<", before.createdAt), eb.and([eb("created_at", "=", before.createdAt), eb("id", "<", before.id)])]));
      return qb.orderBy("created_at", "desc").orderBy("id", "desc").limit(limit).execute();
    }),
  counts: (userId) =>
    run((db) =>
      db
        .selectFrom("notifications")
        .select([
          sql<number>`count(*) filter (where seen_at is null)::int`.as("unseen"),
          sql<number>`count(*) filter (where read_at is null)::int`.as("unread"),
          sql<number>`count(*) filter (where kept_at is not null)::int`.as("kept"),
          sql<number>`count(*)::int`.as("total"),
        ])
        .where("user_id", "=", userId)
        .where("dismissed_at", "is", null)
        .executeTakeFirstOrThrow(),
    ),
  markAllSeen: (userId) =>
    run((db) => db.updateTable("notifications").set({ seen_at: new Date() }).where("user_id", "=", userId).where("seen_at", "is", null).execute()).pipe(Effect.asVoid),
  setRead: (userId, id, read) =>
    run((db) =>
      db
        .updateTable("notifications")
        .set(read ? { read_at: new Date(), seen_at: sql`coalesce(seen_at, now())` } : { read_at: null })
        .where("user_id", "=", userId)
        .where("id", "=", id)
        .where("dismissed_at", "is", null)
        .returningAll()
        .executeTakeFirst(),
    ),
  markAllRead: (userId) =>
    run((db) =>
      db
        .updateTable("notifications")
        .set({ read_at: new Date(), seen_at: sql`coalesce(seen_at, now())` })
        .where("user_id", "=", userId)
        .where("read_at", "is", null)
        .where("dismissed_at", "is", null)
        .executeTakeFirst(),
    ).pipe(Effect.map((r) => Number(r.numUpdatedRows))),
  setKept: (userId, id, kept) =>
    run((db) =>
      db
        .updateTable("notifications")
        .set({ kept_at: kept ? new Date() : null })
        .where("user_id", "=", userId)
        .where("id", "=", id)
        .where("dismissed_at", "is", null)
        .returningAll()
        .executeTakeFirst(),
    ),
  dismiss: (userId, id) =>
    run((db) =>
      db
        .updateTable("notifications")
        // Dismissing also stops a push that hasn't gone out yet.
        .set({ dismissed_at: new Date(), seen_at: sql`coalesce(seen_at, now())`, push_status: sql`case when push_status = 'pending' then 'skipped' else push_status end` })
        .where("user_id", "=", userId)
        .where("id", "=", id)
        .where("dismissed_at", "is", null)
        .executeTakeFirst(),
    ).pipe(Effect.map((r) => Number(r.numUpdatedRows) > 0)),
  dismissRead: (userId) =>
    run((db) =>
      db
        .updateTable("notifications")
        .set({ dismissed_at: new Date() })
        .where("user_id", "=", userId)
        .where("read_at", "is not", null)
        .where("kept_at", "is", null)
        .where("dismissed_at", "is", null)
        .executeTakeFirst(),
    ).pipe(Effect.map((r) => Number(r.numUpdatedRows))),
  countSince: (userId, category, since) =>
    run((db) =>
      db
        .selectFrom("notifications")
        .select(sql<number>`count(*)::int`.as("n"))
        .where("user_id", "=", userId)
        .where("category", "=", category)
        .where("created_at", ">=", since)
        .executeTakeFirstOrThrow(),
    ).pipe(Effect.map((r) => r.n)),
  deleteCategory: (userId, category) =>
    run((db) => db.deleteFrom("notifications").where("user_id", "=", userId).where("category", "=", category).execute()).pipe(Effect.asVoid),
  claimPush: (limit, leaseMs) =>
    run((db) =>
      db
        .updateTable("notifications")
        .set({ push_next_at: new Date(Date.now() + leaseMs), push_attempts: sql`push_attempts + 1` })
        .where(
          "id",
          "in",
          db
            .selectFrom("notifications")
            .select("id")
            .where("push_status", "=", "pending")
            .where("push_next_at", "<=", new Date())
            .orderBy("push_next_at")
            .limit(limit)
            .forUpdate()
            .skipLocked(),
        )
        .returningAll()
        .execute(),
    ),
  finishPush: (id, status, retryAt) =>
    run((db) =>
      db
        .updateTable("notifications")
        .set({ push_status: status, ...(retryAt && { push_next_at: retryAt }) })
        .where("id", "=", id)
        .execute(),
    ).pipe(Effect.asVoid),
  claimEmail: (limit, leaseMs) =>
    run((db) =>
      db
        .updateTable("notifications")
        .set({ email_next_at: new Date(Date.now() + leaseMs), email_attempts: sql`email_attempts + 1` })
        .where(
          "id",
          "in",
          db
            .selectFrom("notifications")
            .select("id")
            .where("email_status", "=", "pending")
            .where("email_next_at", "<=", new Date())
            .orderBy("email_next_at")
            .limit(limit)
            .forUpdate()
            .skipLocked(),
        )
        .returningAll()
        .execute(),
    ),
  finishEmail: (id, status, retryAt) =>
    run((db) =>
      db
        .updateTable("notifications")
        .set({ email_status: status, ...(retryAt && { email_next_at: retryAt }) })
        .where("id", "=", id)
        .execute(),
    ).pipe(Effect.asVoid),
  prune: () =>
    run((db) =>
      db
        .deleteFrom("notifications")
        .where((eb) =>
          eb.or([
            eb("dismissed_at", "<", sql<Date>`now() - interval '30 days'`),
            eb.and([eb("kept_at", "is", null), eb("read_at", "<", sql<Date>`now() - interval '180 days'`)]),
          ]),
        )
        .executeTakeFirst(),
    ).pipe(Effect.map((r) => Number(r.numDeletedRows))),
}));

export const PushSubscriptionRepositoryLive = repo(PushSubscriptionRepository, (run) => ({
  upsert: ({ userId, platform, endpoint, p256dh, auth, userAgent }) =>
    run((db) =>
      db
        .insertInto("push_subscriptions")
        .values({ user_id: userId, platform, endpoint, p256dh, auth, user_agent: userAgent?.slice(0, 300) ?? null })
        // A device that signs in as someone else now belongs to them.
        .onConflict((oc) => oc.column("endpoint").doUpdateSet({ user_id: userId, platform, p256dh, auth, user_agent: userAgent?.slice(0, 300) ?? null, failure_count: 0 }))
        .returningAll()
        .executeTakeFirstOrThrow(),
    ),
  remove: (userId, endpoint) =>
    run((db) => db.deleteFrom("push_subscriptions").where("user_id", "=", userId).where("endpoint", "=", endpoint).executeTakeFirst()).pipe(
      Effect.map((r) => Number(r.numDeletedRows) > 0),
    ),
  listForUser: (userId) => run((db) => db.selectFrom("push_subscriptions").selectAll().where("user_id", "=", userId).execute()),
  recordResult: (id, ok) =>
    run((db) =>
      db
        .updateTable("push_subscriptions")
        .set(ok ? { last_success_at: new Date(), failure_count: 0 } : { failure_count: sql`failure_count + 1` })
        .where("id", "=", id)
        .execute(),
    ).pipe(Effect.asVoid),
  deleteById: (id) => run((db) => db.deleteFrom("push_subscriptions").where("id", "=", id).execute()).pipe(Effect.asVoid),
}));

export const JobLeaseRepositoryLive = repo(JobLeaseRepository, (run) => ({
  acquire: (name, holder, ttlMs) =>
    run((db) =>
      db
        .insertInto("job_leases")
        .values({ name, holder, locked_until: new Date(Date.now() + ttlMs) })
        .onConflict((oc) =>
          oc
            .column("name")
            .doUpdateSet({ holder, locked_until: new Date(Date.now() + ttlMs) })
            .where("job_leases.locked_until", "<", new Date()),
        )
        .returning("holder")
        .executeTakeFirst(),
    ).pipe(Effect.map((r) => r?.holder === holder)),
  release: (name, holder) =>
    run((db) => db.updateTable("job_leases").set({ locked_until: new Date(0) }).where("name", "=", name).where("holder", "=", holder).execute()).pipe(Effect.asVoid),
}));

export const ReminderRepositoryLive = repo(ReminderRepository, (run) => ({
  candidates: () =>
    run((db) =>
      db
        .selectFrom("users")
        .selectAll("users")
        .select((eb) =>
          eb.selectFrom("exercise_progress").select(sql<Date | null>`max(last_practiced_at)`.as("m")).whereRef("exercise_progress.user_id", "=", "users.id").as("last_practiced_at"),
        )
        .where("email_verified_at", "is not", null)
        .where("notify_reminders", "=", true)
        .execute(),
    ).pipe(
      Effect.map((rows) =>
        rows.map(({ last_practiced_at, ...user }) => ({ user, lastPracticedAt: last_practiced_at ? new Date(last_practiced_at) : null })),
      ),
    ),
  activitySince: (userId, since) =>
    run(async (db) => {
      const [problems, mastered] = await Promise.all([
        db.selectFrom("item_results").select(sql<number>`count(*)::int`.as("n")).where("user_id", "=", userId).where("resolved_at", ">=", since).executeTakeFirstOrThrow(),
        db
          .selectFrom("notifications")
          .select(sql<number>`count(*)::int`.as("n"))
          .where("user_id", "=", userId)
          .where("kind", "=", "lesson_mastered")
          .where("created_at", ">=", since)
          .executeTakeFirstOrThrow(),
      ]);
      return { problems: problems.n, mastered: mastered.n };
    }),
}));


type Kdb = import("kysely").Kysely<DB>;

const toMembership = (m: import("kysely").Selectable<LeagueMembersTable>): LeagueMembership => ({
  weekStart: m.week_start,
  cohortId: m.cohort_id,
  tier: m.tier,
  xp: m.xp,
  result: m.result,
  finalRank: m.final_rank,
});

const weekStartDate = (weekStart: string) => new Date(`${weekStart}T00:00:00Z`);

/** Places a learner in the first cohort of their tier with room, or opens a new one. Runs inside a transaction. */
const joinCohort = async (trx: Kdb, userId: string, weekStart: string): Promise<LeagueMembership | undefined> => {
  const existing = await trx.selectFrom("league_members").selectAll().where("week_start", "=", weekStart).where("user_id", "=", userId).executeTakeFirst();
  if (existing) return toMembership(existing);
  const user = await trx.selectFrom("users").select(["league_opt_in", "username", "league_tier"]).where("id", "=", userId).executeTakeFirst();
  if (!user?.league_opt_in || !user.username) return undefined;
  const tier = user.league_tier;
  // One joiner per tier and week at a time, so a cohort never overfills.
  await sql`select pg_advisory_xact_lock(hashtext(${`league:${weekStart}:${tier}`}))`.execute(trx);
  const open = await trx
    .selectFrom("league_cohorts as c")
    .select("c.id")
    .where("c.week_start", "=", weekStart)
    .where("c.tier", "=", tier)
    .where("c.finalized_at", "is", null)
    .where(sql<boolean>`(select count(*) from league_members m where m.cohort_id = c.id) < ${COHORT_SIZE}`)
    .orderBy("c.created_at")
    .limit(1)
    .executeTakeFirst();
  const cohortId = open?.id ?? (await trx.insertInto("league_cohorts").values({ week_start: weekStart, tier }).returning("id").executeTakeFirstOrThrow()).id;
  // XP earned earlier in the week counts, so joining mid-week is fair.
  const earned = await trx
    .selectFrom("item_results")
    .select(sql<number>`coalesce(sum(xp), 0)::int`.as("xp"))
    .where("user_id", "=", userId)
    .where("resolved_at", ">=", weekStartDate(weekStart))
    .executeTakeFirstOrThrow();
  const row =
    (await trx
      .insertInto("league_members")
      .values({ week_start: weekStart, user_id: userId, cohort_id: cohortId, tier, xp: earned.xp })
      .onConflict((oc) => oc.columns(["week_start", "user_id"]).doNothing())
      .returningAll()
      .executeTakeFirst()) ?? (await trx.selectFrom("league_members").selectAll().where("week_start", "=", weekStart).where("user_id", "=", userId).executeTakeFirstOrThrow());
  return toMembership(row);
};

const standingsQuery = (db: Kdb, cohortId: string) =>
  db
    .selectFrom("league_members as m")
    .innerJoin("users as u", "u.id", "m.user_id")
    .select(["m.user_id as userId", "u.username", "m.xp"])
    .where("m.cohort_id", "=", cohortId)
    .orderBy("m.xp", "desc")
    .orderBy("m.xp_at")
    .orderBy("m.user_id")
    .execute()
    .then((rows) => rows.map((r) => ({ userId: r.userId, username: r.username ?? "learner", xp: r.xp })));

export const LeagueRepositoryLive = repo(LeagueRepository, (run) => ({
  join: (userId, weekStart) => run((db) => db.transaction().execute((trx) => joinCohort(trx, userId, weekStart))),
  addXp: (userId, xp, weekStart) =>
    xp <= 0
      ? Effect.void
      : run((db) =>
          db.transaction().execute(async (trx) => {
            const updated = await trx
              .updateTable("league_members")
              .set({ xp: sql`xp + ${xp}`, xp_at: new Date() })
              .where("week_start", "=", weekStart)
              .where("user_id", "=", userId)
              .where("result", "is", null)
              .returning("user_id")
              .executeTakeFirst();
            // Not in a cohort yet this week: joining counts this problem's XP too.
            if (!updated) await joinCohort(trx, userId, weekStart);
          }),
        ),
  leave: (userId, weekStart) =>
    run((db) => db.deleteFrom("league_members").where("week_start", "=", weekStart).where("user_id", "=", userId).where("result", "is", null).execute()).pipe(Effect.asVoid),
  membership: (userId, weekStart) =>
    run((db) => db.selectFrom("league_members").selectAll().where("week_start", "=", weekStart).where("user_id", "=", userId).executeTakeFirst()).pipe(
      Effect.map((m) => m && toMembership(m)),
    ),
  lastSettled: (userId, weekStart) =>
    run((db) =>
      db
        .selectFrom("league_members")
        .selectAll()
        .where("user_id", "=", userId)
        .where("week_start", "<", weekStart)
        .where("result", "is not", null)
        .orderBy("week_start", "desc")
        .limit(1)
        .executeTakeFirst(),
    ).pipe(Effect.map((m) => m && toMembership(m))),
  standings: (cohortId) => run((db) => standingsQuery(db, cohortId)),
  lifetimeXp: (userId) =>
    run((db) => db.selectFrom("item_results").select(sql<number>`coalesce(sum(xp), 0)::int`.as("xp")).where("user_id", "=", userId).executeTakeFirstOrThrow()).pipe(
      Effect.map((r) => r.xp),
    ),
  unsettledCohorts: (weekStart) =>
    run((db) =>
      db.selectFrom("league_cohorts").select("id").where("finalized_at", "is", null).where("week_start", "<", weekStart).orderBy("week_start").limit(500).execute(),
    ).pipe(Effect.map((rows) => rows.map((r) => r.id))),
  settleCohort: (cohortId, decide) =>
    run((db) =>
      db.transaction().execute(async (trx) => {
        const cohort = await trx.selectFrom("league_cohorts").selectAll().where("id", "=", cohortId).where("finalized_at", "is", null).forUpdate().skipLocked().executeTakeFirst();
        if (!cohort) return undefined;
        const members = decide(await standingsQuery(trx, cohortId), cohort.tier);
        if (members.length > 0) {
          const values = sql.join(members.map((m) => sql`(${m.userId}::uuid, ${m.result}, ${m.rank}::smallint, ${m.nextTier}::smallint)`));
          await sql`update league_members m set result = v.result, final_rank = v.rank from (values ${values}) as v(user_id, result, rank, tier) where m.cohort_id = ${cohortId} and m.user_id = v.user_id`.execute(trx);
          await sql`update users u set league_tier = v.tier from (values ${values}) as v(user_id, result, rank, tier) where u.id = v.user_id`.execute(trx);
        }
        await trx.updateTable("league_cohorts").set({ finalized_at: new Date() }).where("id", "=", cohortId).execute();
        return { weekStart: cohort.week_start, tier: cohort.tier, members };
      }),
    ),
}));

/** Columns for the admin's account list; per-row counts are correlated subqueries on indexed user_id. */
const adminUserSelect = (db: import("kysely").Kysely<DB>, masteredAt: number) =>
  db
    .selectFrom("users as u")
    .select((eb) => [
      "u.id",
      "u.email",
      "u.display_name as displayName",
      "u.username",
      "u.avatar_url as avatarUrl",
      sql<boolean>`u.email_verified_at is not null`.as("emailVerified"),
      sql<boolean>`u.password_hash is not null`.as("hasPassword"),
      sql<boolean>`exists (select 1 from oauth_accounts o where o.user_id = u.id and o.provider = 'google')`.as("google"),
      "u.learning_mode as learningMode",
      "u.created_at as createdAt",
      "u.last_active_at as lastActiveAt",
      eb.selectFrom("item_results as r").select(sql<number>`count(*)::int`.as("n")).whereRef("r.user_id", "=", "u.id").as("problems"),
      eb
        .selectFrom("exercise_progress as p")
        .select(sql<number>`count(*)::int`.as("n"))
        .whereRef("p.user_id", "=", "u.id")
        .where("p.mastery", ">=", masteredAt)
        .where("p.sessions_completed", ">", 0)
        .as("mastered"),
      eb.selectFrom("site_visits as v").select(sql<string>`coalesce(sum(v.active_ms), 0)::bigint`.as("n")).whereRef("v.user_id", "=", "u.id").as("timeMs"),
    ]);

const toAdminUser = (
  r: Omit<AdminUserRow, "problems" | "mastered" | "lastActiveAt" | "timeMs"> & { problems: number | null; mastered: number | null; lastActiveAt: Date | null; timeMs: string | null },
): AdminUserRow => ({
  ...r,
  problems: r.problems ?? 0,
  mastered: r.mastered ?? 0,
  timeMs: Number(r.timeMs ?? 0),
});

export const AdminRepositoryLive = repo(AdminRepository, (run) => ({
  overview: (courseId, days, masteredAt) =>
    run(async (db) => {
      const since = sql<Date>`now() - make_interval(days => ${days})`;
      const [totals, practice, daily, signIn, modes, levels, lessons, masteredCounts, leagues] = await Promise.all([
        db
          .selectFrom("users")
          .select([
            sql<number>`count(*)::int`.as("users"),
            sql<number>`count(*) filter (where email_verified_at is not null)::int`.as("verified"),
            sql<number>`count(*) filter (where onboarded_at is not null)::int`.as("onboarded"),
            sql<number>`count(*) filter (where created_at >= now() - interval '7 days')::int`.as("signups7"),
            sql<number>`count(*) filter (where created_at >= now() - interval '30 days')::int`.as("signups30"),
          ])
          .executeTakeFirstOrThrow(),
        db
          .selectFrom("item_results")
          .select([
            sql<number>`count(*)::int`.as("problems"),
            sql<number>`count(*) filter (where clean_solve)::int`.as("cleanSolves"),
            sql<string>`coalesce(sum(time_ms), 0)::bigint`.as("timeMs"),
            sql<number>`count(distinct user_id) filter (where resolved_at >= now() - interval '7 days')::int`.as("active7"),
            sql<number>`count(distinct user_id) filter (where resolved_at >= now() - interval '30 days')::int`.as("active30"),
            (eb) => eb.selectFrom("practice_sessions").select(sql<number>`count(*)::int`.as("n")).where("status", "=", "completed").as("sessionsCompleted"),
          ])
          .where("course_id", "=", courseId)
          .executeTakeFirstOrThrow(),
        sql<{ day: string; signups: number; activeUsers: number; problems: number; cleanSolves: number }>`
          with practice as (
            select date_trunc('day', resolved_at) as d, count(distinct user_id)::int as active_users, count(*)::int as problems, count(*) filter (where clean_solve)::int as clean_solves
            from item_results where resolved_at >= ${since} and course_id = ${courseId} group by 1
          ), signups as (
            select date_trunc('day', created_at) as d, count(*)::int as signups from users where created_at >= ${since} group by 1
          )
          select to_char(coalesce(p.d, s.d), 'YYYY-MM-DD') as day, coalesce(s.signups, 0) as signups, coalesce(p.active_users, 0) as "activeUsers",
                 coalesce(p.problems, 0) as problems, coalesce(p.clean_solves, 0) as "cleanSolves"
          from practice p full join signups s on s.d = p.d order by 1
        `.execute(db),
        db
          .selectFrom("users as u")
          .select([
            sql<number>`count(*) filter (where u.password_hash is not null and o.user_id is null)::int`.as("password"),
            sql<number>`count(*) filter (where u.password_hash is null and o.user_id is not null)::int`.as("google"),
            sql<number>`count(*) filter (where u.password_hash is not null and o.user_id is not null)::int`.as("both"),
          ])
          .leftJoin((eb) => eb.selectFrom("oauth_accounts").select("user_id").distinct().as("o"), (j) => j.onRef("o.user_id", "=", "u.id"))
          .executeTakeFirstOrThrow(),
        db
          .selectFrom("users")
          .select([sql<number>`count(*) filter (where learning_mode = 'path')::int`.as("path"), sql<number>`count(*) filter (where learning_mode = 'audit')::int`.as("audit")])
          .executeTakeFirstOrThrow(),
        db
          .selectFrom("item_results")
          .select(["level", sql<number>`count(*)::int`.as("problems"), sql<number>`count(*) filter (where clean_solve)::int`.as("cleanSolves")])
          .where("course_id", "=", courseId)
          .groupBy("level")
          .orderBy("level")
          .execute(),
        db
          .selectFrom("exercise_progress")
          .select([
            "exercise_id as exerciseId",
            sql<number>`count(*) filter (where items_seen > 0)::int`.as("learners"),
            sql<number>`coalesce(sum(items_seen), 0)::int`.as("problems"),
            sql<number>`coalesce(sum(clean_solves), 0)::int`.as("cleanSolves"),
            sql<number>`count(*) filter (where mastery >= ${masteredAt} and sessions_completed > 0)::int`.as("mastered"),
          ])
          .where("course_id", "=", courseId)
          .groupBy("exercise_id")
          .execute(),
        sql<{ mastered: number; users: number }>`
          select coalesce(m.n, 0)::int as mastered, count(*)::int as users
          from users u
          left join (
            select user_id, count(*) as n from exercise_progress
            where course_id = ${courseId} and mastery >= ${masteredAt} and sessions_completed > 0 group by user_id
          ) m on m.user_id = u.id
          group by 1 order by 1
        `.execute(db),
        db
          .selectFrom("users")
          .select(["league_tier as tier", sql<number>`count(*)::int`.as("users"), sql<number>`count(*) filter (where league_opt_in)::int`.as("optedIn")])
          .groupBy("league_tier")
          .orderBy("league_tier")
          .execute(),
      ]);
      return {
        totals: { ...totals, active7: practice.active7, active30: practice.active30, problems: practice.problems, cleanSolves: practice.cleanSolves, timeMs: Number(practice.timeMs), sessionsCompleted: practice.sessionsCompleted ?? 0 },
        daily: daily.rows,
        signIn,
        modes,
        levels,
        lessons,
        masteredCounts: masteredCounts.rows,
        leagues,
      };
    }),
  listUsers: ({ query, limit, offset, masteredAt }) =>
    run(async (db) => {
      const q = query.trim();
      // Escape LIKE wildcards so a search for "_" or "%" is literal.
      const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      let rows = adminUserSelect(db, masteredAt);
      let count = db.selectFrom("users as u").select(sql<number>`count(*)::int`.as("n"));
      if (q) {
        rows = rows.where((eb) => eb.or([eb("u.email", "ilike", pattern), eb("u.display_name", "ilike", pattern), eb("u.username", "ilike", pattern)]));
        count = count.where((eb) => eb.or([eb("u.email", "ilike", pattern), eb("u.display_name", "ilike", pattern), eb("u.username", "ilike", pattern)]));
      }
      const [users, total] = await Promise.all([rows.orderBy("u.created_at", "desc").orderBy("u.id").limit(limit).offset(offset).execute(), count.executeTakeFirstOrThrow()]);
      return { users: users.map(toAdminUser), total: total.n };
    }),
  findUser: (id, masteredAt) =>
    run((db) => adminUserSelect(db, masteredAt).where("u.id", "=", id).executeTakeFirst()).pipe(Effect.map((r) => r && toAdminUser(r))),
  deleteSessions: (userId) =>
    run((db) => db.deleteFrom("sessions").where("user_id", "=", userId).executeTakeFirst()).pipe(Effect.map((r) => Number(r.numDeletedRows))),
}));

// Units are interpolated as SQL, so only these literals ever reach the query.
const UNITS: Record<TimeUnit, string> = { day: "day", week: "week", month: "month" };

export const VisitRepositoryLive = repo(VisitRepository, (run) => ({
  record: (userId, visitId, activeMs) =>
    run((db) =>
      db
        .insertInto("site_visits")
        .values({ id: visitId, user_id: userId, active_ms: activeMs, started_at: sql<Date>`now() - make_interval(secs => ${activeMs / 1000})` })
        .onConflict((oc) =>
          oc
            .column("id")
            .doUpdateSet({
              // Never more than the wall-clock time since the last heartbeat, plus a little slack for timer jitter.
              active_ms: sql<number>`site_visits.active_ms + least(${activeMs}::int, (extract(epoch from now() - site_visits.last_seen_at) * 1000)::int + 5000)`,
              last_seen_at: sql<Date>`now()`,
            })
            .where("site_visits.user_id", "=", userId),
        )
        .execute(),
    ).pipe(Effect.asVoid),
  buckets: (userId, unit, periods) =>
    run(async (db) => {
      const u = sql.raw(`'${UNITS[unit]}'`);
      const period = sql<string>`to_char(date_trunc(${u}, started_at at time zone 'UTC'), 'YYYY-MM-DD')`;
      let q = db
        .selectFrom("site_visits")
        .select([
          period.as("period"),
          sql<string>`sum(active_ms)::bigint`.as("activeMs"),
          sql<number>`count(*)::int`.as("visits"),
          sql<number>`count(distinct user_id)::int`.as("users"),
        ])
        .where(sql<boolean>`started_at at time zone 'UTC' >= date_trunc(${u}, now() at time zone 'UTC') - make_interval(${sql.raw(`${UNITS[unit]}s`)} => ${periods - 1})`)
        .where("active_ms", ">", 0);
      if (userId) q = q.where("user_id", "=", userId);
      const rows = await q.groupBy(sql`1`).orderBy(sql`1`).execute();
      return rows.map((r) => ({ ...r, activeMs: Number(r.activeMs) }));
    }),
  totals: (userId) =>
    run(async (db) => {
      let q = db
        .selectFrom("site_visits")
        .select([
          sql<string>`coalesce(sum(active_ms), 0)::bigint`.as("activeMs"),
          sql<number>`count(*) filter (where active_ms > 0)::int`.as("visits"),
          sql<number>`count(distinct user_id)::int`.as("users"),
          sql<string>`coalesce(sum(active_ms) filter (where started_at >= date_trunc('day', now() at time zone 'UTC') at time zone 'UTC'), 0)::bigint`.as("todayMs"),
          sql<string>`coalesce(sum(active_ms) filter (where started_at >= now() - interval '7 days'), 0)::bigint`.as("last7Ms"),
          sql<string>`coalesce(sum(active_ms) filter (where started_at >= now() - interval '30 days'), 0)::bigint`.as("last30Ms"),
          sql<number>`count(distinct user_id) filter (where started_at >= now() - interval '30 days' and active_ms > 0)::int`.as("users30"),
        ]);
      if (userId) q = q.where("user_id", "=", userId);
      const r = await q.executeTakeFirstOrThrow();
      return { ...r, activeMs: Number(r.activeMs), todayMs: Number(r.todayMs), last7Ms: Number(r.last7Ms), last30Ms: Number(r.last30Ms) };
    }),
  recent: (userId, limit) =>
    run((db) =>
      db
        .selectFrom("site_visits")
        .select(["id", "started_at as startedAt", "last_seen_at as lastSeenAt", "active_ms as activeMs"])
        .where("user_id", "=", userId)
        .where("active_ms", ">", 0)
        .orderBy("started_at", "desc")
        .limit(limit)
        .execute(),
    ),
}));

export const RepositoriesLive = Layer.mergeAll(
  VisitRepositoryLive,
  AdminRepositoryLive,
  LeagueRepositoryLive,
  UserRepositoryLive,
  AccountRepositoryLive,
  EmailTokenRepositoryLive,
  PasswordResetTokenRepositoryLive,
  SessionRepositoryLive,
  ProgressRepositoryLive,
  PracticeRepositoryLive,
  AnalyticsRepositoryLive,
  NotificationRepositoryLive,
  PushSubscriptionRepositoryLive,
  JobLeaseRepositoryLive,
  ReminderRepositoryLive,
);
