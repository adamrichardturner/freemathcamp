import { sql, type Kysely } from "kysely";

/**
 * Cohorts have no size limit for now, so there's one open cohort per tier and
 * week. Any duplicates from the capped version are merged into the oldest one
 * first, then a unique index keeps it that way. Opted-in learners are enrolled
 * by the leagues job (application/leagues.ts `enrolOptedIn`).
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`
    with keep as (
      select id, first_value(id) over (partition by week_start, tier order by created_at, id) as keeper
      from league_cohorts where finalized_at is null
    )
    update league_members m set cohort_id = keep.keeper from keep where m.cohort_id = keep.id and keep.id <> keep.keeper
  `.execute(db);
  await sql`
    delete from league_cohorts c where finalized_at is null
      and exists (select 1 from league_cohorts o where o.finalized_at is null and o.week_start = c.week_start and o.tier = c.tier and (o.created_at, o.id) < (c.created_at, c.id))
  `.execute(db);
  await db.schema.dropIndex("league_cohorts_open_idx").execute();
  await db.schema.createIndex("league_cohorts_open_idx").on("league_cohorts").columns(["week_start", "tier"]).unique().where(sql.ref("finalized_at"), "is", null).execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropIndex("league_cohorts_open_idx").execute();
  await db.schema.createIndex("league_cohorts_open_idx").on("league_cohorts").columns(["week_start", "tier", "created_at"]).where(sql.ref("finalized_at"), "is", null).execute();
}
