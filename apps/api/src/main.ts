import { Effect } from "effect";
import { AppConfig } from "./config/config";
import { createApp } from "./http/app";
import { makeRuntime } from "./http/runtime";
import { SessionRepository } from "./application/ports";
import { createMigrator } from "./infrastructure/db/database";
import { Database } from "./infrastructure/db/database";

const runtime = makeRuntime();

const main = Effect.gen(function* () {
  const config = yield* AppConfig;
  const db = yield* Database;

  if (process.env.MIGRATE_ON_START === "true") {
    const { error, results } = yield* Effect.promise(() => createMigrator(db).migrateToLatest());
    for (const r of results ?? []) yield* Effect.log(`migration ${r.migrationName}: ${r.status}`);
    if (error) return yield* Effect.die(error);
  }

  const app = createApp(runtime, { webOrigin: config.webOrigin, secureCookies: config.env === "production" });
  const server = app.listen(config.port, () => console.log(`API listening on :${config.port} (${config.env})`));

  // Hourly sweep of expired sessions.
  const sweep = setInterval(() => void runtime.runPromise(Effect.flatMap(SessionRepository, (s) => s.deleteExpired())).catch(() => {}), 3_600_000);

  const shutdown = () => {
    clearInterval(sweep);
    server.close(() => void runtime.dispose().then(() => process.exit(0)));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
});

runtime.runPromise(main).catch((e) => {
  console.error("Failed to start API:", e);
  process.exit(1);
});
