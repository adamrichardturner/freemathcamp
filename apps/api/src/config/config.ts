import { Config, Context, Effect, Layer, type Option, Redacted } from "effect";

export interface AppConfigShape {
  readonly env: "development" | "production" | "test";
  readonly port: number;
  readonly databaseUrl: Redacted.Redacted<string>;
  readonly webOrigin: string;
  readonly sessionTtlDays: number;
  /** Google sign-in is enabled only when both are set. */
  readonly google: Option.Option<{ clientId: string; clientSecret: Redacted.Redacted<string> }>;
}

export class AppConfig extends Context.Tag("AppConfig")<AppConfig, AppConfigShape>() {}

const config = Config.all({
  env: Config.literal("development", "production", "test")("NODE_ENV").pipe(Config.withDefault("development" as const)),
  port: Config.port("PORT").pipe(Config.withDefault(4100)),
  databaseUrl: Config.redacted("DATABASE_URL"),
  webOrigin: Config.url("WEB_ORIGIN").pipe(
    Config.map((u) => u.origin),
    Config.withDefault("http://localhost:3000"),
  ),
  sessionTtlDays: Config.integer("SESSION_TTL_DAYS").pipe(
    Config.validate({ message: "SESSION_TTL_DAYS must be 1–90", validation: (n) => n >= 1 && n <= 90 }),
    Config.withDefault(30),
  ),
  google: Config.option(
    Config.all({
      clientId: Config.nonEmptyString("GOOGLE_CLIENT_ID"),
      clientSecret: Config.redacted("GOOGLE_CLIENT_SECRET"),
    }),
  ),
});

export const AppConfigLive = Layer.effect(AppConfig, Effect.map(config, (c) => c as AppConfigShape));
