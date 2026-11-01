import { getCourse } from "@fmc/curriculum";
import { Effect } from "effect";
import { RateLimited, Unauthorized, ValidationError } from "../domain/errors";
import type { User } from "../infrastructure/db/schema";
import { PasswordHasher } from "../infrastructure/security/password";
import { hashToken } from "../infrastructure/security/tokens";
import { toPublicUser } from "./auth";
import { notices } from "../domain/notifications";
import { notifySafely } from "./notifications";
import { isValidTimeZone } from "../domain/reminders";
import { AccountRepository, NotificationRepository, SessionRepository, UserRepository, type UserPreferencesPatch } from "./ports";

const DAY = 86_400_000;
/** Names show on progress and (later) shared spaces, so changes are limited to curb abuse. */
export const NAME_CHANGES_PER_DAY = 3;

const nameChangeWindow = (userId: string) =>
  Effect.gen(function* () {
    const events = yield* Effect.flatMap(AccountRepository, (a) => a.eventsSince(userId, "name_changed", new Date(Date.now() - DAY)));
    const remaining = Math.max(0, NAME_CHANGES_PER_DAY - events.length);
    // When the oldest change in the window ages out, one more change becomes available.
    const nextAllowedAt = remaining === 0 && events[0] ? new Date(events[0].getTime() + DAY) : null;
    return { remaining, nextAllowedAt };
  });

export const accountSettings = (user: User, sessionToken: string | undefined) =>
  Effect.gen(function* () {
    const activeSessions = yield* Effect.flatMap(SessionRepository, (s) => s.countActive(user.id));
    const names = yield* nameChangeWindow(user.id);
    const linked = yield* Effect.flatMap(AccountRepository, (a) => a.linkedProviders(user.id));
    return {
      user: toPublicUser(user),
      security: { activeSessions, otherSessions: Math.max(0, activeSessions - (sessionToken ? 1 : 0)), linkedProviders: linked },
      nameChanges: { remaining: names.remaining, limit: NAME_CHANGES_PER_DAY, nextAllowedAt: names.nextAllowedAt?.toISOString() ?? null },
    };
  });

export const changeDisplayName = (user: User, displayName: string) =>
  Effect.gen(function* () {
    const name = displayName.trim();
    if (name === user.display_name) return toPublicUser(user);
    const { remaining, nextAllowedAt } = yield* nameChangeWindow(user.id);
    if (remaining === 0)
      return yield* Effect.fail(
        new RateLimited({ message: `You've changed your name ${NAME_CHANGES_PER_DAY} times today. You can change it again ${nextAllowedAt ? `after ${nextAllowedAt.toUTCString()}` : "tomorrow"}.` }),
      );
    const updated = yield* Effect.flatMap(UserRepository, (u) => u.updateDisplayName(user.id, name));
    yield* Effect.flatMap(AccountRepository, (a) => a.recordEvent(user.id, "name_changed"));
    return toPublicUser(updated);
  });

export const updatePreferences = (user: User, prefs: UserPreferencesPatch) =>
  Effect.gen(function* () {
    if (Object.values(prefs).every((v) => v === undefined)) return toPublicUser(user);
    if (prefs.timezone !== undefined && !isValidTimeZone(prefs.timezone)) return yield* Effect.fail(new ValidationError({ message: "Unknown time zone." }));
    const updated = yield* Effect.flatMap(UserRepository, (u) => u.updatePreferences(user.id, prefs));
    if (prefs.learningMode && prefs.learningMode !== user.learning_mode) yield* Effect.flatMap(AccountRepository, (a) => a.recordEvent(user.id, "mode_changed"));
    return toPublicUser(updated);
  });

/** Marks the welcome tour as seen (finished or skipped) so it isn't shown again. */
export const completeOnboarding = (user: User) =>
  user.onboarded_at ? Effect.succeed(toPublicUser(user)) : Effect.flatMap(UserRepository, (u) => u.markOnboarded(user.id)).pipe(Effect.map(toPublicUser));

/** Changes (or, for Google-only accounts, sets) the password and signs out other devices. */
export const changePassword = (user: User, sessionToken: string, input: { currentPassword?: string | undefined; newPassword: string }) =>
  Effect.gen(function* () {
    const hasher = yield* PasswordHasher;
    if (user.password_hash) {
      const ok = input.currentPassword ? yield* hasher.verify(user.password_hash, input.currentPassword) : false;
      if (!ok) return yield* Effect.fail(new Unauthorized({ message: "Your current password is incorrect." }));
      if (input.currentPassword === input.newPassword)
        return yield* Effect.fail(new ValidationError({ message: "Choose a password different from your current one." }));
    }
    const passwordHash = yield* hasher.hash(input.newPassword);
    const updated = yield* Effect.flatMap(UserRepository, (u) => u.updatePasswordHash(user.id, passwordHash));
    const signedOut = yield* Effect.flatMap(SessionRepository, (s) => s.deleteOthers(user.id, hashToken(sessionToken)));
    yield* Effect.flatMap(AccountRepository, (a) => a.recordEvent(user.id, "password_changed"));
    yield* notifySafely(user, notices.passwordChanged(user.password_hash !== null, signedOut));
    return { user: toPublicUser(updated), signedOutSessions: signedOut };
  });

export const signOutOtherSessions = (user: User, sessionToken: string) =>
  Effect.gen(function* () {
    const removed = yield* Effect.flatMap(SessionRepository, (s) => s.deleteOthers(user.id, hashToken(sessionToken)));
    if (removed > 0) {
      yield* Effect.flatMap(AccountRepository, (a) => a.recordEvent(user.id, "sessions_revoked"));
      yield* notifySafely(user, notices.sessionsRevoked(removed));
    }
    return { signedOutSessions: removed };
  });

export const resetCourseProgress = (user: User, courseId: string) =>
  Effect.gen(function* () {
    yield* Effect.flatMap(AccountRepository, (a) => a.resetCourse(user.id, courseId));
    yield* Effect.flatMap(AccountRepository, (a) => a.recordEvent(user.id, "progress_reset"));
    // Milestones can be earned again from scratch.
    yield* Effect.flatMap(NotificationRepository, (n) => n.deleteCategory(user.id, "progress"));
    yield* notifySafely(user, notices.progressReset(getCourse(courseId)?.title ?? "Course"));
    return { ok: true };
  });

export const exportAccountData = (user: User) => Effect.flatMap(AccountRepository, (a) => a.exportData(user.id));

/** Permanently deletes the account. Requires the email typed out, plus the password when one exists. */
export const deleteAccount = (user: User, input: { confirmEmail: string; password?: string | undefined }) =>
  Effect.gen(function* () {
    if (input.confirmEmail.trim().toLowerCase() !== user.email.toLowerCase())
      return yield* Effect.fail(new ValidationError({ message: "Type your email address exactly to confirm." }));
    if (user.password_hash) {
      const ok = input.password ? yield* Effect.flatMap(PasswordHasher, (h) => h.verify(user.password_hash!, input.password!)) : false;
      if (!ok) return yield* Effect.fail(new Unauthorized({ message: "Your password is incorrect." }));
    }
    yield* Effect.flatMap(UserRepository, (u) => u.delete(user.id));
    return { deleted: true };
  });
