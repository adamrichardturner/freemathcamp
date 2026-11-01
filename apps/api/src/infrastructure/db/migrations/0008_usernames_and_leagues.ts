import { sql, type Kysely } from "kysely";

/**
 * Public usernames (unique regardless of case) and Leagues: weekly cohorts in
 * tiers, ranked by XP. Each problem's XP is stored on its result so a week's
 * total is a sum, and kept as a running total per member so standings are one
 * indexed read. Existing results are backfilled with the same formula as
 * domain/leagues.ts `xpFor`.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("username", sql`citext`, (c) => c.unique().check(sql`username ~ '^[A-Za-z][A-Za-z0-9_]{2,19}$'`))
    .addColumn("league_opt_in", "boolean", (c) => c.notNull().defaultTo(false))
    .addColumn("league_tier", "smallint", (c) => c.notNull().defaultTo(0))
    .execute();

  await db.schema.alterTable("item_results").addColumn("xp", "smallint", (c) => c.notNull().defaultTo(0)).execute();
  await sql`
    update item_results set xp = case when revealed then 0 else round(
      (case level when 1 then 10 when 2 then 15 else 20 end)
      * (case when wrong_attempts = 0 then 1 when wrong_attempts = 1 then 0.5 else 0.25 end)
      * (case when hints_used > 0 then 0.75 else 1 end)
    ) end
  `.execute(db);

  await db.schema
    .createTable("league_cohorts")
    .addColumn("id", "uuid", (c) => c.primaryKey().defaultTo(sql`gen_random_uuid()`))
    .addColumn("week_start", "date", (c) => c.notNull())
    .addColumn("tier", "smallint", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("finalized_at", "timestamptz")
    .execute();
  await db.schema.createIndex("league_cohorts_open_idx").on("league_cohorts").columns(["week_start", "tier", "created_at"]).where(sql.ref("finalized_at"), "is", null).execute();

  await db.schema
    .createTable("league_members")
    .addColumn("week_start", "date", (c) => c.notNull())
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("cohort_id", "uuid", (c) => c.notNull().references("league_cohorts.id").onDelete("cascade"))
    .addColumn("tier", "smallint", (c) => c.notNull())
    .addColumn("xp", "integer", (c) => c.notNull().defaultTo(0))
    // When the current total was reached: ties go to whoever got there first.
    .addColumn("xp_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("result", "varchar(10)", (c) => c.check(sql`result in ('promoted', 'stayed', 'demoted')`))
    .addColumn("final_rank", "smallint")
    .addPrimaryKeyConstraint("league_members_pk", ["week_start", "user_id"])
    .execute();
  await db.schema.createIndex("league_members_standings_idx").on("league_members").columns(["cohort_id", "xp desc", "xp_at"]).execute();
  await db.schema.createIndex("league_members_history_idx").on("league_members").columns(["user_id", "week_start desc"]).execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("league_members").ifExists().execute();
  await db.schema.dropTable("league_cohorts").ifExists().execute();
  await db.schema.alterTable("item_results").dropColumn("xp").execute();
  await db.schema.alterTable("users").dropColumn("league_tier").dropColumn("league_opt_in").dropColumn("username").execute();
}
