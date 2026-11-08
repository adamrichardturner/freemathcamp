import { sql, type Kysely } from "kysely";

/** Forgotten passwords: single-use, short-lived reset link tokens (only their hash is stored). */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable("password_reset_tokens")
    .addColumn("id", "char(64)", (c) => c.primaryKey()) // SHA-256 of the emailed token
    .addColumn("user_id", "uuid", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("expires_at", "timestamptz", (c) => c.notNull())
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();
  await db.schema.createIndex("password_reset_tokens_user_idx").on("password_reset_tokens").columns(["user_id", "created_at"]).execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable("password_reset_tokens").ifExists().execute();
}
