import { Effect } from "effect";
import { AppConfig } from "../config/config";
import { addDays } from "../domain/engine";
import { RateLimited, Unauthorized } from "../domain/errors";
import type { User } from "../infrastructure/db/schema";
import { verificationEmail } from "../infrastructure/email/templates";
import { hashToken, newSessionToken } from "../infrastructure/security/tokens";
import { EmailSender, EmailTokenRepository, UserRepository } from "./ports";

const MAX_EMAILS_PER_HOUR = 3;

/** Emails a fresh single-use verification link. Rate limited per user. */
export const sendVerificationEmail = (user: User) =>
  Effect.gen(function* () {
    if (user.email_verified_at) return { sent: false as const, alreadyVerified: true };
    const tokens = yield* EmailTokenRepository;
    const recent = yield* tokens.countSince(user.id, new Date(Date.now() - 3_600_000));
    if (recent >= MAX_EMAILS_PER_HOUR)
      return yield* Effect.fail(new RateLimited({ message: "We've sent a few emails already. Check your inbox (and spam), or try again in an hour." }));

    const { webOrigin } = yield* AppConfig;
    const token = newSessionToken();
    yield* tokens.create({ id: hashToken(token), userId: user.id, expiresAt: addDays(new Date(), 1) });
    const email = verificationEmail({ name: user.display_name, link: `${webOrigin}/verify-email?token=${encodeURIComponent(token)}` });
    yield* Effect.flatMap(EmailSender, (s) => s.send({ to: user.email, ...email }));
    return { sent: true as const, alreadyVerified: false };
  });

/** Consumes a link token and marks the owner's email verified. */
export const verifyEmail = (token: string) =>
  Effect.gen(function* () {
    const userId = yield* Effect.flatMap(EmailTokenRepository, (t) => t.consume(hashToken(token)));
    if (!userId) return yield* Effect.fail(new Unauthorized({ message: "This link has expired or was already used. Request a new one." }));
    return yield* Effect.flatMap(UserRepository, (u) => u.markEmailVerified(userId));
  });
