import { Context, Effect, Layer, Redacted } from "effect";
import { Kysely, PostgresDialect } from "kysely";
import { Migrator } from "kysely/migration";
import pg from "pg";
import { AppConfig } from "../../config/config";
import { DatabaseError } from "../../domain/errors";
import { migrations } from "./migrations";
import type { DB } from "./schema";

// int8 (bigint) columns hold millisecond totals well within Number range.
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));

export const createKysely = (connectionString: string) =>
  new Kysely<DB>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString, max: 10, idleTimeoutMillis: 30_000 }) }),
  });

export class Database extends Context.Tag("Database")<Database, Kysely<DB>>() {}

/** Acquires the pool for the app's lifetime and closes it on shutdown. */
export const DatabaseLive = Layer.scoped(
  Database,
  Effect.gen(function* () {
    const { databaseUrl } = yield* AppConfig;
    return yield* Effect.acquireRelease(
      Effect.sync(() => createKysely(Redacted.value(databaseUrl))),
      (db) => Effect.promise(() => db.destroy()),
    );
  }),
);

/** Runs a Kysely query as an Effect with a typed DatabaseError. */
export const query = <A>(run: (db: Kysely<DB>) => Promise<A>) =>
  Effect.flatMap(Database, (db) => Effect.tryPromise({ try: () => run(db), catch: (cause) => new DatabaseError({ cause }) }));

export const createMigrator = (db: Kysely<DB>) =>
  new Migrator({ db, provider: { getMigrations: async () => migrations } });
