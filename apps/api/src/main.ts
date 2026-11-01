import { Effect, Option, Redacted } from "effect";
import { AppConfig } from "./config/config";
import { createApp } from "./http/app";
import { makeRuntime, type AppServices } from "./http/runtime";
import { hostname } from "node:os";
import { deliverPendingEmail, deliverPendingPush, pruneNotifications, runReminders, withLease } from "./application/jobs";
import { enrolOptedIn, settleFinishedWeeks } from "./application/leagues";
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

  const app = createApp(runtime, {
    webOrigin: config.webOrigin,
    secureCookies: config.env === "production",
    proxySecret: Option.getOrUndefined(Option.map(config.proxySecret, Redacted.value)),
  });
  const server = app.listen(config.port, () => console.log(`API listening on :${config.port} (${config.env})`));

  // Background jobs. Each tick is skipped while the previous one is still running.
  const every = (ms: number, job: Effect.Effect<unknown, unknown, AppServices>) => {
    let running = false;
    return setInterval(() => {
      if (running) return;
      running = true;
      void runtime
        .runPromise(job)
        .catch((e) => console.error("[job]", e))
        .finally(() => (running = false));
    }, ms);
  };
  const holder = `${hostname()}:${process.pid}`;
  const timers = [
    // Hourly: expired sessions, and dismissed or long-read notifications.
    every(3_600_000, Effect.flatMap(SessionRepository, (s) => s.deleteExpired())),
    every(3_600_000, withLease("prune-notifications", holder, 10 * 60_000, pruneNotifications)),
    ...(config.jobsEnabled
      ? [
          // Push outbox: near-real-time delivery; row locking makes this safe on several instances.
          every(5_000, deliverPendingPush),
          // Email outbox: security notices and re-engagement reminders.
          every(15_000, deliverPendingEmail),
          // Reminders: one instance at a time; each learner gets at most one nudge a day.
          every(10 * 60_000, withLease("reminders", holder, 9 * 60_000, Effect.suspend(() => runReminders()))),
          // Leagues: settle last week's cohorts soon after Monday 00:00 UTC, then place every opted-in learner in the new week.
          every(5 * 60_000, withLease("leagues", holder, 4 * 60_000, Effect.zipRight(settleFinishedWeeks, enrolOptedIn))),
        ]
      : []),
  ];

  const shutdown = () => {
    timers.forEach(clearInterval);
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
