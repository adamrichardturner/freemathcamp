import { LEARNING_MODES } from "@fmc/curriculum";
import { Effect, ParseResult, Schema } from "effect";
import { ValidationError } from "../domain/errors";

/** Decodes untrusted input, failing with a readable ValidationError. */
export const decode = <A, I>(schema: Schema.Schema<A, I>, input: unknown) =>
  Schema.decodeUnknown(schema, { errors: "all", onExcessProperty: "ignore" })(input).pipe(
    Effect.mapError((e) => {
      const issues = ParseResult.ArrayFormatter.formatErrorSync(e).map((i) => ({ path: i.path.join("."), message: i.message }));
      return new ValidationError({ message: issues[0]?.message ?? "Invalid request.", issues });
    }),
  );

const trimmed = (max: number) => Schema.Trim.pipe(Schema.maxLength(max));

export const Email = trimmed(254).pipe(
  Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, { message: () => "Enter a valid email address." }),
);

export const Password = Schema.String.pipe(
  Schema.minLength(10, { message: () => "Password must be at least 10 characters." }),
  Schema.maxLength(128, { message: () => "Password must be at most 128 characters." }),
  Schema.filter((p) => /[a-zA-Z]/.test(p) && /[^a-zA-Z]/.test(p), { message: () => "Use a mix of letters and numbers or symbols." }),
);

export const DisplayName = trimmed(60).pipe(Schema.minLength(1, { message: () => "Tell us what to call you." }));

export const RegisterBody = Schema.Struct({ email: Email, password: Password, displayName: DisplayName });
export const LoginBody = Schema.Struct({ email: Email, password: Schema.String.pipe(Schema.maxLength(128)) });
export const ProfileBody = Schema.Struct({ displayName: DisplayName });
export const PreferencesBody = Schema.Struct({
  dailyGoal: Schema.optional(Schema.Int.pipe(Schema.between(1, 100, { message: () => "Pick a daily goal between 1 and 100 problems." }))),
  learningMode: Schema.optional(Schema.Literal(...LEARNING_MODES)),
  timezone: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(64))),
  notifyReminders: Schema.optional(Schema.Boolean),
  notifyProgress: Schema.optional(Schema.Boolean),
  notifyEmailReminders: Schema.optional(Schema.Boolean),
});
export const ChangePasswordBody = Schema.Struct({
  currentPassword: Schema.optional(Schema.String.pipe(Schema.maxLength(128))),
  newPassword: Password,
});
export const ResetProgressBody = Schema.Struct({ courseId: Schema.String.pipe(Schema.pattern(/^[a-z0-9-]{1,64}$/)) });
export const DeleteAccountBody = Schema.Struct({
  confirmEmail: Schema.String.pipe(Schema.maxLength(254)),
  password: Schema.optional(Schema.String.pipe(Schema.maxLength(128))),
});
export const VerifyEmailBody = Schema.Struct({ token: Schema.String.pipe(Schema.minLength(20), Schema.maxLength(100)) });

const Slug = Schema.String.pipe(Schema.pattern(/^[a-z0-9-]{1,64}$/));
const Index = Schema.Int.pipe(Schema.between(0, 50));
const TimeMs = Schema.Int.pipe(Schema.between(0, 24 * 3_600_000));
const Hints = Schema.Int.pipe(Schema.between(0, 10));

export const CourseParams = Schema.Struct({ courseId: Slug });
export const ExerciseParams = Schema.Struct({ courseId: Slug, exerciseId: Slug });
export const SessionParams = Schema.Struct({ sessionId: Schema.UUID });
export const StartPracticeBody = Schema.Struct({
  courseId: Slug,
  exerciseId: Slug,
  mode: Schema.optionalWith(Schema.Literal("learn", "review", "challenge"), { default: () => "learn" as const }),
});
export const AttemptBody = Schema.Struct({ index: Index, answer: Schema.String.pipe(Schema.maxLength(200)), timeMs: TimeMs, hintsUsed: Hints });
export const RevealBody = Schema.Struct({ index: Index, timeMs: TimeMs, hintsUsed: Hints });

/* ---- Notifications ---- */

export const NotificationListQuery = Schema.Struct({
  filter: Schema.optionalWith(Schema.Literal("all", "unread", "kept"), { default: () => "all" as const }),
  cursor: Schema.optional(Schema.String.pipe(Schema.maxLength(200))),
  limit: Schema.optional(Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 50))),
});
export const NotificationParams = Schema.Struct({ id: Schema.UUID });
export const NotificationReadBody = Schema.Struct({ read: Schema.Boolean });
export const NotificationKeepBody = Schema.Struct({ kept: Schema.Boolean });

/**
 * The server POSTs to registered endpoints, so only the browsers' own push
 * services are accepted (no arbitrary URLs: that would be an SSRF vector).
 */
const PUSH_HOSTS = /^https:\/\/([a-z0-9-]+\.)*(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com)(:\d+)?\//;
const WebEndpoint = Schema.String.pipe(
  Schema.maxLength(1000),
  Schema.filter((u) => PUSH_HOSTS.test(u), { message: () => "Unsupported push service." }),
);
const Base64Url = (max: number) => Schema.String.pipe(Schema.pattern(/^[A-Za-z0-9_-]+=*$/), Schema.maxLength(max));
const ApnsToken = Schema.String.pipe(Schema.pattern(/^[0-9a-fA-F]{64,200}$/, { message: () => "Invalid device token." }));

export const PushSubscribeBody = Schema.Union(
  Schema.Struct({ platform: Schema.Literal("web"), endpoint: WebEndpoint, keys: Schema.Struct({ p256dh: Base64Url(200), auth: Base64Url(100) }) }),
  Schema.Struct({ platform: Schema.Literal("ios"), token: ApnsToken }),
);
export const PushUnsubscribeBody = Schema.Union(Schema.Struct({ endpoint: WebEndpoint }), Schema.Struct({ token: ApnsToken }));

export const UnsubscribeQuery = Schema.Struct({ token: Schema.UUID });
