import { sql, type Kysely } from "kysely";

/** Email verification: a verified-at stamp on users and single-use link tokens. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("users").addColumn("email_verified_at", "timestamptz").execute();
  // Google already verified the email of every OAuth-created account.
  await sql`update users set email_verified_at = created_at where id in (select user_id from oauth_accounts)`.execute(db);

  await db.schema
    .createTable("email_verification_tokens")
    .addColumn("id", "char(64)", (c) => c.primaryKey()) // SHA-256 of the emailed token
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("expires_at", "timestamptz", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema.createIndex("email_tokens_user_idx").on("email_verification_tokens").columns(["user_id", "created_at"]).execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("email_verification_tokens").ifExists().execute();
  await db.schema.alterTable("users").dropColumn("email_verified_at").execute();
}
