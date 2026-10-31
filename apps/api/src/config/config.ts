import { Config, Context, Effect, Layer, type Option, Redacted } from "effect";

export interface AppConfigShape {
  readonly env: "development" | "production" | "test";
  readonly port: number;
  readonly databaseUrl: Redacted.Redacted<string>;
  readonly webOrigin: string;
  readonly sessionTtlDays: number;
  /** Google sign-in is enabled only when both are set. */
  readonly google: Option.Option<{ clientId: string; clientSecret: Redacted.Redacted<string> }>;
  /** Shared secret the Next.js proxy uses to vouch for forwarded client IPs. */
  readonly proxySecret: Option.Option<Redacted.Redacted<string>>;
  /** Without a key, emails are logged instead of sent (development and tests). */
  readonly resendApiKey: Option.Option<Redacted.Redacted<string>>;
  readonly emailFrom: string;
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
  proxySecret: Config.option(Config.redacted("PROXY_SECRET")),
  resendApiKey: Config.option(Config.redacted("RESEND_API_KEY")),
  emailFrom: Config.string("EMAIL_FROM").pipe(Config.withDefault("FreeMathCamp <noreply@freemathcamp.app>")),
});

export const AppConfigLive = Layer.effect(AppConfig, Effect.map(config, (c) => c as AppConfigShape));
