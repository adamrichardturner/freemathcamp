import { sql, type Kysely } from "kysely";

/**
 * Time on site. A visit is one stretch of use (a new one starts after 30 idle
 * minutes); the web app sends heartbeats with the time the learner was actively
 * on the page, and the visit's id is chosen by the client so heartbeats are
 * simple upserts.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("site_visits")
    .addColumn("id", "uuid", (c) => c.primaryKey())
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("started_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("last_seen_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("active_ms", "integer", (c) => c.notNull().defaultTo(0).check(sql`active_ms >= 0`))
    .execute();
  await db.schema.createIndex("site_visits_user_idx").on("site_visits").columns(["user_id", "started_at desc"]).execute();
  await db.schema.createIndex("site_visits_started_idx").on("site_visits").column("started_at").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("site_visits").ifExists().execute();
}
