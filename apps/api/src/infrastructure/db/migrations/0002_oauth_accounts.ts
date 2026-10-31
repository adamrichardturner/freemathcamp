import { sql, type Kysely } from "kysely";

/** Third-party sign-in (Google). OAuth-only users have no password. */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("users").alterColumn("password_hash", (c) => c.dropNotNull()).execute();
  await db.schema.alterTable("users").addColumn("avatar_url", "varchar(500)").execute();

  await db.schema
    .createTable("oauth_accounts")
    .addColumn("provider", "varchar(32)", (c) => c.notNull())
    .addColumn("provider_user_id", "varchar(255)", (c) => c.notNull())
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("email", sql`citext`, (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addPrimaryKeyConstraint("oauth_accounts_pk", ["provider", "provider_user_id"])
    .execute();
  await db.schema.createIndex("oauth_accounts_user_idx").on("oauth_accounts").column("user_id").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("oauth_accounts").ifExists().execute();
  await db.schema.alterTable("users").dropColumn("avatar_url").execute();
  await sql`update users set password_hash = '' where password_hash is null`.execute(db);
  await db.schema.alterTable("users").alterColumn("password_hash", (c) => c.setNotNull()).execute();
}
