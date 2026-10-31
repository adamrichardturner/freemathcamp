import { Context, type Effect } from "effect";
import type { Conflict, DatabaseError } from "../domain/errors";
import type { ExerciseProgress, ExerciseProgressUpdate, ItemResult, PracticeItem, PracticeSession, User } from "../infrastructure/db/schema";

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
}
export class SessionRepository extends Context.Tag("SessionRepository")<SessionRepository, SessionRepositoryShape>() {}

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
