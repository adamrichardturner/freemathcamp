import type { LearningMode } from "@fmc/curriculum";
import { Effect } from "effect";
import { AppConfig } from "../config/config";
import { isAdmin } from "../domain/admin";
import { Unauthorized, ValidationError } from "../domain/errors";
import { isReservedUsername } from "../domain/leagues";
import { PasswordHasher } from "../infrastructure/security/password";
import { hashToken, newSessionToken } from "../infrastructure/security/tokens";
import type { User } from "../infrastructure/db/schema";
import { describeDevice, notices } from "../domain/notifications";
import { sendVerificationEmail } from "./email-verification";
import { notifySafely } from "./notifications";
import { SessionRepository, UserRepository } from "./ports";
import { addDays } from "../domain/engine";
import type { GoogleIdentity } from "../infrastructure/oauth/google";

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  /** Null for accounts that haven't chosen one yet; the app asks after sign-in. */
  username: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
  emailVerified: boolean;
  dailyGoal: number;
  learningMode: LearningMode;
  onboarded: boolean;
  timezone: string;
  notifications: { reminders: boolean; progress: boolean; emailReminders: boolean };
  leagueOptIn: boolean;
  /** Only shows the admin link; every admin route checks for itself. */
  isAdmin: boolean;
  createdAt: string;
}

export const toPublicUser = (u: User): PublicUser => ({
  id: u.id,
  email: u.email,
  displayName: u.display_name,
  username: u.username,
  avatarUrl: u.avatar_url,
  hasPassword: u.password_hash !== null,
  emailVerified: u.email_verified_at !== null,
  dailyGoal: u.daily_goal,
  learningMode: u.learning_mode,
  onboarded: u.onboarded_at !== null,
  timezone: u.timezone,
  notifications: { reminders: u.notify_reminders, progress: u.notify_progress, emailReminders: u.notify_email_reminders },
  leagueOptIn: u.league_opt_in,
  isAdmin: isAdmin(u),
  createdAt: u.created_at.toISOString(),
});

export interface ClientInfo {
  userAgent: string | null;
  ip: string | null;
}

/** Rules the schema can't express: reserved names. Format is checked by the request schema and a database constraint. */
export const checkUsername = (raw: string) => {
  const username = raw.trim();
  return isReservedUsername(username) ? Effect.fail(new ValidationError({ message: "That username is reserved. Try another." })) : Effect.succeed(username);
};

const INVALID = new Unauthorized({ message: "Incorrect email or password." });

const startSession = (user: User, client: ClientInfo) =>
  Effect.gen(function* () {
    const sessions = yield* SessionRepository;
    const { sessionTtlDays } = yield* AppConfig;
    const token = newSessionToken();
    const expiresAt = addDays(new Date(), sessionTtlDays);
    yield* sessions.create({ id: hashToken(token), userId: user.id, expiresAt, userAgent: client.userAgent?.slice(0, 300) ?? null, ip: client.ip });
    const previousIp = yield* Effect.flatMap(UserRepository, (u) => u.recordLoginIp(user.id, client.ip));
    return { token, expiresAt, user: toPublicUser(user), previousIp };
  });

export const register = (input: { email: string; password: string; displayName: string; username: string }, client: ClientInfo) =>
  Effect.gen(function* () {
    const users = yield* UserRepository;
    const hasher = yield* PasswordHasher;
    const username = yield* checkUsername(input.username);
    const passwordHash = yield* hasher.hash(input.password);
    const user = yield* users.create({ email: input.email.trim().toLowerCase(), displayName: input.displayName.trim(), username, passwordHash });
    // A delivery hiccup shouldn't lose the sign-up; the learner can resend from the app.
    yield* sendVerificationEmail(user).pipe(Effect.catchAll((e) => Effect.logWarning("verification email failed", e)));
    yield* notifySafely(user, notices.welcome(user.display_name, false));
    return yield* startSession(user, client);
  });

/** Starts a session for a user who just proved control of their email. */
export const signInVerified = (user: User, client: ClientInfo) => startSession(user, client);

/**
 * Starts a session, flagging it when the IP differs from the previous sign-in's.
 * With nothing to compare against (no earlier IP on record) there's no notice.
 */
const startSessionNoticing = (user: User, client: ClientInfo) =>
  Effect.gen(function* () {
    const session = yield* startSession(user, client);
    if (client.ip && session.previousIp && session.previousIp !== client.ip)
      yield* notifySafely(user, notices.newSignIn(describeDevice(client.userAgent?.slice(0, 300) ?? null), client.ip));
    return session;
  });

export const login = (input: { email: string; password: string }, client: ClientInfo) =>
  Effect.gen(function* () {
    const users = yield* UserRepository;
    const hasher = yield* PasswordHasher;
    const user = yield* users.findByEmail(input.email.trim().toLowerCase());
    if (!user || user.password_hash === null) {
      yield* hasher.dummyVerify(input.password);
      return yield* Effect.fail(INVALID);
    }
    const ok = yield* hasher.verify(user.password_hash, input.password);
    if (!ok) return yield* Effect.fail(INVALID);
    yield* users.touch(user.id);
    return yield* startSessionNoticing(user, client);
  });

/** Signs in (or signs up) with an identity Google has already verified. */
export const loginWithGoogle = (identity: GoogleIdentity, client: ClientInfo) =>
  Effect.gen(function* () {
    const users = yield* UserRepository;
    const existing = yield* users.findByOAuth("google", identity.sub);
    if (existing) {
      yield* users.touch(existing.id);
      return yield* startSessionNoticing(existing, client);
    }
    // Linking by email is safe: Google verified it. An unverified password account
    // with the same email is reclaimed (password cleared, sessions ended) in the repository.
    const email = identity.email.toLowerCase();
    const byEmail = yield* users.findByEmail(email);
    const user = yield* users.upsertOAuthUser({
      provider: "google",
      providerUserId: identity.sub,
      email,
      displayName: identity.name || identity.email.split("@")[0]!,
      avatarUrl: identity.picture,
    });
    yield* users.touch(user.id);
    yield* notifySafely(user, byEmail?.email_verified_at ? notices.googleLinked() : notices.welcome(user.display_name, true));
    return yield* startSession(user, client);
  });

export const logout = (token: string) => Effect.flatMap(SessionRepository, (s) => s.delete(hashToken(token)));

/**
 * Resolves a cookie token to a user. Sessions slide: once past half their
 * lifetime they're extended, so active learners stay signed in.
 */
export const authenticate = (token: string) =>
  Effect.gen(function* () {
    const sessions = yield* SessionRepository;
    const users = yield* UserRepository;
    const { sessionTtlDays } = yield* AppConfig;
    const session = yield* sessions.find(hashToken(token));
    if (!session) return yield* Effect.fail(new Unauthorized({ message: "Session expired. Please sign in again." }));
    const user = yield* users.findById(session.userId);
    if (!user) return yield* Effect.fail(new Unauthorized({ message: "Account not found." }));
    const remainingDays = (session.expiresAt.getTime() - Date.now()) / 86_400_000;
    const renewed = remainingDays < sessionTtlDays / 2 ? addDays(new Date(), sessionTtlDays) : null;
    if (renewed) yield* sessions.extend(session.id, renewed);
    return { user, renewedUntil: renewed };
  });
