import type { Kysely } from "kysely";

/**
 * Sign in with Apple: the refresh token Apple issues for each linked account,
 * kept so deleting the account can revoke the app's access, as Apple requires.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("oauth_accounts").addColumn("refresh_token", "text").execute();
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("oauth_accounts").dropColumn("refresh_token").execute();
}
