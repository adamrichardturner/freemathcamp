import { Effect } from "effect";
import { AppConfig } from "../config/config";
import { Unauthorized } from "../domain/errors";
import { PasswordHasher } from "../infrastructure/security/password";
import { hashToken, newSessionToken } from "../infrastructure/security/tokens";
import type { User } from "../infrastructure/db/schema";
import { sendVerificationEmail } from "./email-verification";
import { SessionRepository, UserRepository } from "./ports";
import { addDays } from "../domain/engine";
import type { GoogleIdentity } from "../infrastructure/oauth/google";

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  emailVerified: boolean;
  createdAt: string;
}

export const toPublicUser = (u: User): PublicUser => ({
  id: u.id,
  email: u.email,
  displayName: u.display_name,
  avatarUrl: u.avatar_url,
  hasPassword: u.password_hash !== null,
  emailVerified: u.email_verified_at !== null,
  createdAt: u.created_at.toISOString(),
});

export interface ClientInfo {
  userAgent: string | null;
  ip: string | null;
}

const INVALID = new Unauthorized({ message: "Incorrect email or password." });

const startSession = (user: User, client: ClientInfo) =>
  Effect.gen(function* () {
    const sessions = yield* SessionRepository;
    const { sessionTtlDays } = yield* AppConfig;
    const token = newSessionToken();
    const expiresAt = addDays(new Date(), sessionTtlDays);
    yield* sessions.create({ id: hashToken(token), userId: user.id, expiresAt, userAgent: client.userAgent?.slice(0, 300) ?? null, ip: client.ip });
    return { token, expiresAt, user: toPublicUser(user) };
  });

export const register = (input: { email: string; password: string; displayName: string }, client: ClientInfo) =>
  Effect.gen(function* () {
    const users = yield* UserRepository;
    const hasher = yield* PasswordHasher;
    const passwordHash = yield* hasher.hash(input.password);
    const user = yield* users.create({ email: input.email.trim().toLowerCase(), displayName: input.displayName.trim(), passwordHash });
    // A delivery hiccup shouldn't lose the sign-up; the learner can resend from the app.
    yield* sendVerificationEmail(user).pipe(Effect.catchAll((e) => Effect.logWarning("verification email failed", e)));
    return yield* startSession(user, client);
  });

/** Starts a session for a user who just proved control of their email. */
export const signInVerified = (user: User, client: ClientInfo) => startSession(user, client);

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
    return yield* startSession(user, client);
  });

/** Signs in (or signs up) with an identity Google has already verified. */
export const loginWithGoogle = (identity: GoogleIdentity, client: ClientInfo) =>
  Effect.gen(function* () {
    const users = yield* UserRepository;
    const existing = yield* users.findByOAuth("google", identity.sub);
    // Linking by email is safe: Google verified it. An unverified password account
    // with the same email is reclaimed (password cleared, sessions ended) in the repository.
    const user =
      existing ??
      (yield* users.upsertOAuthUser({
        provider: "google",
        providerUserId: identity.sub,
        email: identity.email.toLowerCase(),
        displayName: identity.name || identity.email.split("@")[0]!,
        avatarUrl: identity.picture,
      }));
    yield* users.touch(user.id);
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

export const updateProfile = (userId: string, displayName: string) =>
  Effect.flatMap(UserRepository, (users) => users.updateDisplayName(userId, displayName.trim())).pipe(Effect.map(toPublicUser));
