import type { LearningMode } from "@fmc/curriculum";
import { Context, type Effect } from "effect";
import type { Conflict, DatabaseError, EmailDeliveryError } from "../domain/errors";
import type { AccountEventKind, ExerciseProgress, ExerciseProgressUpdate, ItemResult, PracticeItem, PracticeSession, User } from "../infrastructure/db/schema";

/*
 * Ports: what the use cases need from persistence. Implementations live in
 * infrastructure/repositories and are wired together with Layers.
 */

type Db<A> = Effect.Effect<A, DatabaseError>;

export interface UserRepositoryShape {
  create(input: { email: string; displayName: string; passwordHash: string | null }): Effect.Effect<User, DatabaseError | Conflict>;
  findByEmail(email: string): Db<User | undefined>;
  findById(id: string): Db<User | undefined>;
  touch(id: string): Db<void>;
  updateDisplayName(id: string, displayName: string): Db<User>;
  findByOAuth(provider: "google", providerUserId: string): Db<User | undefined>;
  /** Links a provider identity to a user (creating the user if needed) atomically. */
  upsertOAuthUser(input: { provider: "google"; providerUserId: string; email: string; displayName: string; avatarUrl: string | null }): Db<User>;
  markEmailVerified(id: string): Db<User>;
  updatePreferences(id: string, prefs: { dailyGoal?: number | undefined; learningMode?: LearningMode | undefined }): Db<User>;
  markOnboarded(id: string): Db<User>;
  updatePasswordHash(id: string, passwordHash: string): Db<User>;
  /** Deletes the user; every owned row cascades with it. */
  delete(id: string): Db<void>;
}
export class UserRepository extends Context.Tag("UserRepository")<UserRepository, UserRepositoryShape>() {}

export interface SessionRecord {
  id: string;
  userId: string;
  expiresAt: Date;
}
export interface SessionRepositoryShape {
  create(input: { id: string; userId: string; expiresAt: Date; userAgent: string | null; ip: string | null }): Db<void>;
  find(id: string): Db<SessionRecord | undefined>;
  extend(id: string, expiresAt: Date): Db<void>;
  delete(id: string): Db<void>;
  deleteExpired(): Db<number>;
  countActive(userId: string): Db<number>;
  /** Signs out every other device, keeping the given session. Returns how many were removed. */
  deleteOthers(userId: string, keepId: string): Db<number>;
}
export class SessionRepository extends Context.Tag("SessionRepository")<SessionRepository, SessionRepositoryShape>() {}

export interface EmailTokenRepositoryShape {
  create(input: { id: string; userId: string; expiresAt: Date }): Db<void>;
  /** Deletes and returns the owner of an unexpired token, so each link works once. */
  consume(id: string): Db<string | undefined>;
  countSince(userId: string, since: Date): Db<number>;
}
export class EmailTokenRepository extends Context.Tag("EmailTokenRepository")<EmailTokenRepository, EmailTokenRepositoryShape>() {}

export interface AccountRepositoryShape {
  recordEvent(userId: string, kind: AccountEventKind): Db<void>;
  /** Events of a kind since a time, oldest first. */
  eventsSince(userId: string, kind: AccountEventKind, since: Date): Db<Date[]>;
  resetCourse(userId: string, courseId: string): Db<void>;
  linkedProviders(userId: string): Db<string[]>;
  /** Everything stored about a learner, for the data export. */
  exportData(userId: string): Db<Record<string, unknown>>;
}
export class AccountRepository extends Context.Tag("AccountRepository")<AccountRepository, AccountRepositoryShape>() {}

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}
export interface EmailSenderShape {
  send(email: OutgoingEmail): Effect.Effect<void, EmailDeliveryError>;
}
export class EmailSender extends Context.Tag("EmailSender")<EmailSender, EmailSenderShape>() {}

export interface ProgressRepositoryShape {
  listForCourse(userId: string, courseId: string): Db<ExerciseProgress[]>;
  find(userId: string, courseId: string, exerciseId: string): Db<ExerciseProgress | undefined>;
  /** Inserts a default row if none exists and returns it. */
  ensure(userId: string, courseId: string, exerciseId: string): Db<ExerciseProgress>;
  update(userId: string, courseId: string, exerciseId: string, patch: ExerciseProgressUpdate): Db<ExerciseProgress>;
}
export class ProgressRepository extends Context.Tag("ProgressRepository")<ProgressRepository, ProgressRepositoryShape>() {}

export interface NewItemResult {
  sessionId: string;
  itemIndex: number;
  userId: string;
  courseId: string;
  exerciseId: string;
  level: number;
  wrongAttempts: number;
  revealed: boolean;
  hintsUsed: number;
  timeMs: number;
  struggle: number;
  cleanSolve: boolean;
  masteryAfter: number;
}

export interface PracticeRepositoryShape {
  createSession(input: {
    userId: string;
    courseId: string;
    exerciseId: string;
    mode: PracticeSession["mode"];
    targetItems: number;
    firstItem: PracticeItem;
    masteryBefore: number;
  }): Db<PracticeSession>;
  findSession(id: string, userId: string): Db<PracticeSession | undefined>;
  appendItem(id: string, item: PracticeItem): Db<void>;
  completeSession(id: string, masteryAfter: number): Db<void>;
  abandonActive(userId: string, exerciseId: string): Db<void>;
  recordAttempt(input: { sessionId: string; userId: string; itemIndex: number; answer: string; correct: boolean; timeMs: number }): Db<void>;
  wrongAttemptsFor(sessionId: string, itemIndex: number): Db<number>;
  /** Returns false if the item was already resolved (idempotency guard). */
  recordItemResult(input: NewItemResult): Db<boolean>;
  itemResults(sessionId: string): Db<ItemResult[]>;
  recentSessions(userId: string, courseId: string, limit: number, exerciseId?: string): Db<PracticeSession[]>;
}
export class PracticeRepository extends Context.Tag("PracticeRepository")<PracticeRepository, PracticeRepositoryShape>() {}

export interface DailyActivity {
  day: string;
  problems: number;
  cleanSolves: number;
  timeMs: number;
  meanStruggle: number;
}

export interface AnalyticsRepositoryShape {
  dailyActivity(userId: string, courseId: string, days: number): Db<DailyActivity[]>;
  activeDays(userId: string): Db<string[]>;
  levelBreakdown(userId: string, courseId: string): Db<{ level: number; problems: number; cleanSolves: number }[]>;
  masteryTimeline(userId: string, courseId: string, exerciseId: string): Db<{ at: Date; mastery: number; struggle: number }[]>;
}
export class AnalyticsRepository extends Context.Tag("AnalyticsRepository")<AnalyticsRepository, AnalyticsRepositoryShape>() {}
