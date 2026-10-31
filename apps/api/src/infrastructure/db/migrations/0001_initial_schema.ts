import { sql, type Kysely } from "kysely";

export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`create extension if not exists pgcrypto`.execute(db);
  await sql`create extension if not exists citext`.execute(db);

  await db.schema
    .createTable("users")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("email", sql`citext`, (c) => c.notNull().unique())
    .addColumn("display_name", "varchar(60)", (c) => c.notNull())
    .addColumn("password_hash", "text", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("last_active_at", "timestamptz")
    .execute();

  await db.schema
    .createTable("sessions")
    .addColumn("id", "char(64)", (c) => c.primaryKey())
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("expires_at", "timestamptz", (c) => c.notNull())
    .addColumn("last_seen_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("user_agent", "varchar(300)")
    .addColumn("ip", "varchar(64)")
    .execute();
  await db.schema.createIndex("sessions_user_idx").on("sessions").column("user_id").execute();
  await db.schema.createIndex("sessions_expires_idx").on("sessions").column("expires_at").execute();

  await db.schema
    .createTable("exercise_progress")
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("course_id", "varchar(64)", (c) => c.notNull())
    .addColumn("exercise_id", "varchar(64)", (c) => c.notNull())
    .addColumn("mastery", "real", (c) => c.notNull().defaultTo(0.15))
    .addColumn("struggle", "real", (c) => c.notNull().defaultTo(0))
    .addColumn("items_seen", "integer", (c) => c.notNull().defaultTo(0))
    .addColumn("clean_solves", "integer", (c) => c.notNull().defaultTo(0))
    .addColumn("wrong_attempts", "integer", (c) => c.notNull().defaultTo(0))
    .addColumn("reveals", "integer", (c) => c.notNull().defaultTo(0))
    .addColumn("hints_used", "integer", (c) => c.notNull().defaultTo(0))
    .addColumn("total_time_ms", "bigint", (c) => c.notNull().defaultTo(0))
    .addColumn("sessions_completed", "integer", (c) => c.notNull().defaultTo(0))
    .addColumn("ease", "real", (c) => c.notNull().defaultTo(2.5))
    .addColumn("interval_days", "real", (c) => c.notNull().defaultTo(0))
    .addColumn("review_count", "integer", (c) => c.notNull().defaultTo(0))
    .addColumn("due_at", "timestamptz")
    .addColumn("first_practiced_at", "timestamptz")
    .addColumn("last_practiced_at", "timestamptz")
    .addColumn("lesson_viewed_at", "timestamptz")
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("exercise_progress_pk", ["user_id", "course_id", "exercise_id"])
    .addCheckConstraint("mastery_range", sql`mastery between 0 and 1`)
    .addCheckConstraint("struggle_range", sql`struggle between 0 and 1`)
    .execute();
  await db.schema.createIndex("progress_due_idx").on("exercise_progress").columns(["user_id", "due_at"]).execute();

  await db.schema
    .createTable("practice_sessions")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("course_id", "varchar(64)", (c) => c.notNull())
    .addColumn("exercise_id", "varchar(64)", (c) => c.notNull())
    .addColumn("mode", "varchar(16)", (c) => c.notNull().check(sql`mode in ('learn','review','challenge')`))
    .addColumn("status", "varchar(16)", (c) => c.notNull().defaultTo("active").check(sql`status in ('active','completed','abandoned')`))
    .addColumn("target_items", "smallint", (c) => c.notNull())
    .addColumn("items", "jsonb", (c) => c.notNull().defaultTo(sql`'[]'::jsonb`))
    .addColumn("mastery_before", "real", (c) => c.notNull())
    .addColumn("mastery_after", "real")
    .addColumn("started_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("completed_at", "timestamptz")
    .execute();
  await db.schema.createIndex("practice_sessions_user_idx").on("practice_sessions").columns(["user_id", "started_at"]).execute();

  await db.schema
    .createTable("item_results")
    .addColumn("session_id", "uuid", (c) => c.notNull().references("practice_sessions.id").onDelete("cascade"))
    .addColumn("item_index", "smallint", (c) => c.notNull())
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("course_id", "varchar(64)", (c) => c.notNull())
    .addColumn("exercise_id", "varchar(64)", (c) => c.notNull())
    .addColumn("level", "smallint", (c) => c.notNull())
    .addColumn("wrong_attempts", "smallint", (c) => c.notNull())
    .addColumn("revealed", "boolean", (c) => c.notNull())
    .addColumn("hints_used", "smallint", (c) => c.notNull())
    .addColumn("time_ms", "integer", (c) => c.notNull())
    .addColumn("struggle", "real", (c) => c.notNull())
    .addColumn("clean_solve", "boolean", (c) => c.notNull())
    .addColumn("mastery_after", "real", (c) => c.notNull())
    .addColumn("resolved_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("item_results_pk", ["session_id", "item_index"])
    .execute();
  await db.schema.createIndex("item_results_user_time_idx").on("item_results").columns(["user_id", "resolved_at"]).execute();

  await db.schema
    .createTable("attempts")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("session_id", "uuid", (c) => c.notNull().references("practice_sessions.id").onDelete("cascade"))
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("item_index", "smallint", (c) => c.notNull())
    .addColumn("answer", "varchar(200)", (c) => c.notNull())
    .addColumn("correct", "boolean", (c) => c.notNull())
    .addColumn("time_ms", "integer", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema.createIndex("attempts_session_idx").on("attempts").columns(["session_id", "item_index"]).execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const t of ["attempts", "item_results", "practice_sessions", "exercise_progress", "sessions", "users"])
    await db.schema.dropTable(t).ifExists().execute();
}
