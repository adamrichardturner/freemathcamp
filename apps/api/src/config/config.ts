import { Config, Context, Effect, Layer, type Option, Redacted } from "effect";

export interface AppConfigShape {
  readonly env: "development" | "production" | "test";
  readonly port: number;
  readonly databaseUrl: Redacted.Redacted<string>;
  readonly webOrigin: string;
  readonly sessionTtlDays: number;
  /** Google sign-in is enabled only when both are set. */
  readonly google: Option.Option<{ clientId: string; clientSecret: Redacted.Redacted<string> }>;
  /** Google sign-in in the iOS app: the iOS OAuth client its ID tokens are issued to. */
  readonly googleIosClientId: Option.Option<string>;
  /** Sign in with Apple in the iOS app: Apple's ID tokens name the app's bundle id as their audience. */
  readonly appleBundleId: string;
  /** Shared secret the Next.js proxy uses to vouch for forwarded client IPs. */
  readonly proxySecret: Option.Option<Redacted.Redacted<string>>;
  /** Without a key, emails are logged instead of sent (development and tests). */
  readonly resendApiKey: Option.Option<Redacted.Redacted<string>>;
  readonly emailFrom: string;
  /** A monitored mailbox, so replies reach someone (mailbox providers distrust unrepliable mail). */
  readonly emailReplyTo: string;
  /** Web Push (VAPID) keys; without them browser push is off and notifications stay in-app. */
  readonly vapid: Option.Option<{ publicKey: string; privateKey: Redacted.Redacted<string>; subject: string }>;
  /** APNs token auth for the iOS app; without it iOS push is off. */
  readonly apns: Option.Option<{ keyId: string; teamId: string; bundleId: string; privateKey: Redacted.Redacted<string>; production: boolean }>;
  /** Background jobs (push delivery, reminders). Off in tests, which drive them directly. */
  readonly jobsEnabled: boolean;
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
  googleIosClientId: Config.option(Config.nonEmptyString("GOOGLE_IOS_CLIENT_ID")),
  appleBundleId: Config.string("APPLE_BUNDLE_ID").pipe(Config.withDefault("com.freemathcamp.app")),
  proxySecret: Config.option(Config.redacted("PROXY_SECRET")),
  resendApiKey: Config.option(Config.redacted("RESEND_API_KEY")),
  emailFrom: Config.string("EMAIL_FROM").pipe(Config.withDefault("FreeMathCamp <noreply@freemathcamp.app>")),
  emailReplyTo: Config.string("EMAIL_REPLY_TO").pipe(Config.withDefault("FreeMathCamp <hello@freemathcamp.app>")),
  vapid: Config.option(
    Config.all({
      publicKey: Config.nonEmptyString("VAPID_PUBLIC_KEY"),
      privateKey: Config.redacted("VAPID_PRIVATE_KEY"),
      // Push services contact this if something goes wrong.
      subject: Config.string("VAPID_SUBJECT").pipe(Config.withDefault("https://freemathcamp.app")),
    }),
  ),
  apns: Config.option(
    Config.all({
      keyId: Config.nonEmptyString("APNS_KEY_ID"),
      teamId: Config.nonEmptyString("APNS_TEAM_ID"),
      bundleId: Config.nonEmptyString("APNS_BUNDLE_ID"),
      privateKey: Config.redacted("APNS_PRIVATE_KEY"),
      production: Config.boolean("APNS_PRODUCTION").pipe(Config.withDefault(false)),
    }),
  ),
  jobsEnabled: Config.boolean("JOBS_ENABLED").pipe(Config.withDefault(true)),
});

export const AppConfigLive = Layer.effect(AppConfig, Effect.map(config, (c) => c as AppConfigShape));
