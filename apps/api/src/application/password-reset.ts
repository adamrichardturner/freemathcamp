import { Effect } from "effect";
import { AppConfig } from "../config/config";
import { LinkExpired, LinkInvalid } from "../domain/errors";
import { notices } from "../domain/notifications";
import { passwordResetEmail } from "../infrastructure/email/templates";
import { PasswordHasher } from "../infrastructure/security/password";
import { hashToken, newSessionToken } from "../infrastructure/security/tokens";
import { notifySafely } from "./notifications";
import { AccountRepository, EmailSender, PasswordResetTokenRepository, SessionRepository, UserRepository } from "./ports";

/** How long a reset link works. */
export const RESET_TOKEN_TTL_MS = 60 * 60_000;
const MAX_EMAILS_PER_HOUR = 3;

const EXPIRED = new LinkExpired({ message: "This reset link has expired. Links work for an hour, so request a new one and use it straight away." });
const INVALID = new LinkInvalid({ message: "This reset link isn't valid. It may have been used already, or copied only in part. Request a new one." });

/**
 * Emails a single-use reset link to the account with this address, if there is
 * one. Callers answer the same way whatever happens here, so the response never
 * reveals whether an account exists; extra requests in the hour are dropped
 * quietly for the same reason.
 *
 * Accounts that only sign in with Google or Apple get a link too: following it
 * proves control of the inbox, and adds a password as Settings would.
 */
export const requestPasswordReset = (rawEmail: string) =>
  Effect.gen(function* () {
    const user = yield* Effect.flatMap(UserRepository, (u) => u.findByEmail(rawEmail.trim().toLowerCase()));
    if (!user) return { sent: false as const };
    const tokens = yield* PasswordResetTokenRepository;
    const recent = yield* tokens.countSince(user.id, new Date(Date.now() - 3_600_000));
    if (recent >= MAX_EMAILS_PER_HOUR) return { sent: false as const };

    const { webOrigin } = yield* AppConfig;
    const token = newSessionToken();
    yield* tokens.create({ id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) });
    const email = passwordResetEmail({ name: user.display_name, link: `${webOrigin}/reset-password?token=${encodeURIComponent(token)}`, origin: webOrigin });
    yield* Effect.flatMap(EmailSender, (s) => s.send({ to: user.email, ...email }));
    return { sent: true as const };
  });

/** Fails with LinkExpired or LinkInvalid for a token that can't be used. */
const failFor = (tokenHash: string) =>
  Effect.flatMap(PasswordResetTokenRepository, (t) => t.find(tokenHash)).pipe(Effect.flatMap((found) => Effect.fail(found ? EXPIRED : INVALID)));

/** Checks a link before asking for a new password, without using it up. */
export const checkResetToken = (token: string) =>
  Effect.gen(function* () {
    const found = yield* Effect.flatMap(PasswordResetTokenRepository, (t) => t.find(hashToken(token)));
    if (!found) return yield* Effect.fail(INVALID);
    if (found.expiresAt.getTime() <= Date.now()) return yield* Effect.fail(EXPIRED);
    return { valid: true as const };
  });

/**
 * Sets a new password from a reset link. The link is used up, along with any
 * others outstanding, and every session ends, so whoever knew the old password
 * is signed out everywhere. Following the link proves control of the inbox, so
 * the email counts as confirmed too.
 */
export const resetPassword = (input: { token: string; password: string }) =>
  Effect.gen(function* () {
    const hasher = yield* PasswordHasher;
    const tokens = yield* PasswordResetTokenRepository;
    const users = yield* UserRepository;
    // Hash first: it's the slow part, and the token stays unspent if it fails.
    const passwordHash = yield* hasher.hash(input.password);
    const tokenHash = hashToken(input.token);
    const userId = yield* tokens.consume(tokenHash);
    if (!userId) return yield* failFor(tokenHash);
    const user = yield* users.findById(userId);
    if (!user) return yield* Effect.fail(INVALID);

    yield* users.updatePasswordHash(user.id, passwordHash);
    const updated = user.email_verified_at ? user : yield* users.markEmailVerified(user.id);
    yield* tokens.deleteForUser(user.id);
    const signedOut = yield* Effect.flatMap(SessionRepository, (s) => s.deleteAll(user.id));
    yield* Effect.flatMap(AccountRepository, (a) => a.recordEvent(user.id, "password_changed"));
    yield* notifySafely(user, notices.passwordResetByLink(signedOut));
    return { user: { ...updated, password_hash: passwordHash }, signedOutSessions: signedOut };
  });
