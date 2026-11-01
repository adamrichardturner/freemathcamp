import { sql, type Kysely } from "kysely";

/** Path vs audit mode, and when the learner finished (or skipped) onboarding. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable("users")
    .addColumn("learning_mode", "varchar(8)", (c) => c.notNull().defaultTo("path").check(sql`learning_mode in ('path', 'audit')`))
    .addColumn("onboarded_at", "timestamptz")
    .execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("users").dropColumn("onboarded_at").dropColumn("learning_mode").execute();
}
