import { sql, type Kysely } from "kysely";

/**
 * The IP of each learner's most recent sign-in, so a new-sign-in notice is only
 * raised when it changes. Backfilled from the newest session that recorded one.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("users").addColumn("last_login_ip", "varchar(64)").execute();
  await sql`
    update users u set last_login_ip = s.ip
    from (select distinct on (user_id) user_id, ip from sessions where ip is not null order by user_id, created_at desc) s
    where s.user_id = u.id
  `.execute(db);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable("users").dropColumn("last_login_ip").execute();
}
