import { sql, type Kysely } from "kysely";

/** Learner preferences, plus an event log used for rate limits (e.g. name changes) and auditing. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("daily_goal", "smallint", (c) => c.notNull().defaultTo(10).check(sql`daily_goal between 1 and 100`))
    .execute();

  await db.schema
    .createTable("account_events")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("kind", "varchar(32)", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema.createIndex("account_events_lookup_idx").on("account_events").columns(["user_id", "kind", "created_at"]).execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("account_events").ifExists().execute();
  await db.schema.alterTable("users").dropColumn("daily_goal").execute();
}
