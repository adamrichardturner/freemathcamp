import { sql, type Kysely } from "kysely";

/**
 * Leagues are opt-out rather than opt-in: new learners join by default, and can
 * leave during onboarding, in Settings, on the dashboard or the leagues page.
 * Existing learners who never chose are opted in too; anyone who has ever been
 * in a cohort and is now out left on purpose, so they stay out.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await sql`alter table users alter column league_opt_in set default true`.execute(db);
  await sql`update users u set league_opt_in = true where not u.league_opt_in and not exists (select 1 from league_members m where m.user_id = u.id)`.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await sql`alter table users alter column league_opt_in set default false`.execute(db);
}
