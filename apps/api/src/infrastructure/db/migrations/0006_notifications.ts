import { sql, type Kysely } from "kysely";

/**
 * In-app notifications (also the outbox for push and email delivery), registered push
 * endpoints (Web Push and APNs), per-learner notification preferences and a
 * lease table so background jobs run on one API instance at a time.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("timezone", "varchar(64)", (c) => c.notNull().defaultTo("UTC"))
    .addColumn("notify_reminders", "boolean", (c) => c.notNull().defaultTo(true))
    .addColumn("notify_progress", "boolean", (c) => c.notNull().defaultTo(true))
    .addColumn("notify_email_reminders", "boolean", (c) => c.notNull().defaultTo(true))
    // Lets the link in a reminder email unsubscribe without signing in.
    .addColumn("email_unsubscribe_token", "uuid", (c) => c.notNull().unique().defaultTo(sql`gen_random_uuid()`))
    .execute();

  await db.schema
    .createTable("notifications")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("kind", "varchar(40)", (c) => c.notNull())
    .addColumn("category", "varchar(16)", (c) => c.notNull().check(sql`category in ('account', 'progress', 'reminder')`))
    .addColumn("title", "varchar(160)", (c) => c.notNull())
    .addColumn("body", "text", (c) => c.notNull())
    .addColumn("href", "varchar(300)")
    .addColumn("data", "jsonb", (c) => c.notNull().defaultTo(sql`'{}'::jsonb`))
    // Makes one-off notifications (milestones, a day's reminder) idempotent.
    .addColumn("dedupe_key", "varchar(160)")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("seen_at", "timestamptz")
    .addColumn("read_at", "timestamptz")
    .addColumn("kept_at", "timestamptz")
    .addColumn("dismissed_at", "timestamptz")
    .addColumn("push_status", "varchar(12)", (c) => c.notNull().defaultTo("pending").check(sql`push_status in ('pending', 'sent', 'skipped', 'failed')`))
    .addColumn("push_attempts", "smallint", (c) => c.notNull().defaultTo(0))
    .addColumn("push_next_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    // Important notices and re-engagement reminders are emailed too (same outbox pattern as push).
    .addColumn("email_status", "varchar(12)", (c) => c.notNull().defaultTo("skipped").check(sql`email_status in ('pending', 'sent', 'skipped', 'failed')`))
    .addColumn("email_attempts", "smallint", (c) => c.notNull().defaultTo(0))
    .addColumn("email_next_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema.createIndex("notifications_dedupe_idx").on("notifications").columns(["user_id", "dedupe_key"]).unique().where(sql.ref("dedupe_key"), "is not", null).execute();
  await db.schema.createIndex("notifications_feed_idx").on("notifications").columns(["user_id", "created_at desc"]).where(sql.ref("dismissed_at"), "is", null).execute();
  await db.schema.createIndex("notifications_push_queue_idx").on("notifications").column("push_next_at").where(sql.ref("push_status"), "=", "pending").execute();
  await db.schema.createIndex("notifications_email_queue_idx").on("notifications").column("email_next_at").where(sql.ref("email_status"), "=", "pending").execute();

  await db.schema
    .createTable("push_subscriptions")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("platform", "varchar(8)", (c) => c.notNull().check(sql`platform in ('web', 'ios')`))
    // A Web Push endpoint URL, or an APNs device token.
    .addColumn("endpoint", "text", (c) => c.notNull().unique())
    .addColumn("p256dh", "text")
    .addColumn("auth", "text")
    .addColumn("user_agent", "varchar(300)")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("last_success_at", "timestamptz")
    .addColumn("failure_count", "integer", (c) => c.notNull().defaultTo(0))
    .execute();
  await db.schema.createIndex("push_subscriptions_user_idx").on("push_subscriptions").column("user_id").execute();

  await db.schema
    .createTable("job_leases")
    .addColumn("name", "varchar(64)", (c) => c.primaryKey())
    .addColumn("locked_until", "timestamptz", (c) => c.notNull())
    .addColumn("holder", "varchar(64)", (c) => c.notNull())
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("job_leases").ifExists().execute();
  await db.schema.dropTable("push_subscriptions").ifExists().execute();
  await db.schema.dropTable("notifications").ifExists().execute();
  await db.schema.alterTable("users").dropColumn("email_unsubscribe_token").dropColumn("notify_email_reminders").dropColumn("notify_progress").dropColumn("notify_reminders").dropColumn("timezone").execute();
}
