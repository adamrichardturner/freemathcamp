import type { LearningMode } from "@fmc/curriculum";
import { Context, type Effect } from "effect";
import type { Conflict, DatabaseError, EmailDeliveryError } from "../domain/errors";
import type { NotificationDraft } from "../domain/notifications";
import type {
  AccountEventKind,
  ExerciseProgress,
  ExerciseProgressUpdate,
  ItemResult,
  Notification,
  NotificationCategory,
  OAuthProvider,
  PracticeItem,
  PracticeSession,
  PushPlatform,
  PushSubscription,
  User,
} from "../infrastructure/db/schema";

/*
 * Ports: what the use cases need from persistence. Implementations live in
 * infrastructure/repositories and are wired together with Layers.
 */

type Db<A> = Effect.Effect<A, DatabaseError>;

export interface UserPreferencesPatch {
  dailyGoal?: number | undefined;
  learningMode?: LearningMode | undefined;
  timezone?: string | undefined;
  notifyReminders?: boolean | undefined;
  notifyProgress?: boolean | undefined;
  notifyEmailReminders?: boolean | undefined;
  leagueOptIn?: boolean | undefined;
}

export interface UserRepositoryShape {
  create(input: { email: string; displayName: string; username: string | null; passwordHash: string | null }): Effect.Effect<User, DatabaseError | Conflict>;
  /** Fails with Conflict when another account has it, in any letter case. */
  setUsername(id: string, username: string): Effect.Effect<User, DatabaseError | Conflict>;
  usernameTaken(username: string, exceptUserId?: string): Db<boolean>;
  findByEmail(email: string): Db<User | undefined>;
  findById(id: string): Db<User | undefined>;
  touch(id: string): Db<void>;
  /** Stores the IP of a new sign-in and returns the one it replaced. */
  recordLoginIp(id: string, ip: string | null): Db<string | null>;
  updateDisplayName(id: string, displayName: string): Db<User>;
  findByOAuth(provider: OAuthProvider, providerUserId: string): Db<User | undefined>;
  /** Links a provider identity to a user (creating the user if needed) atomically. */
  upsertOAuthUser(input: { provider: OAuthProvider; providerUserId: string; email: string; displayName: string; avatarUrl: string | null }): Db<User>;
  markEmailVerified(id: string): Db<User>;
  /** Turns reminder emails off for whoever owns this token; returns the user, if any. */
  unsubscribeReminderEmails(token: string): Db<User | undefined>;
  updatePreferences(id: string, prefs: UserPreferencesPatch): Db<User>;
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
  /** Extra headers, e.g. List-Unsubscribe on reminder emails. */
  headers?: Record<string, string>;
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
  xp: number;
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

/* ---- Time on site ---- */

export type TimeUnit = "day" | "week" | "month";

export interface TimeBucket {
  /** Start of the period, YYYY-MM-DD (UTC; weeks start on Monday). */
  period: string;
  activeMs: number;
  visits: number;
  users: number;
}

export interface VisitTotals {
  activeMs: number;
  visits: number;
  users: number;
  todayMs: number;
  last7Ms: number;
  last30Ms: number;
  /** Learners with any time in the last 30 days. */
  users30: number;
}

export interface VisitRow {
  id: string;
  startedAt: Date;
  lastSeenAt: Date;
  activeMs: number;
}

export interface VisitRepositoryShape {
  /**
   * Adds active time to a visit, creating it on the first heartbeat. The time
   * added is capped by how long it's been since the last heartbeat, so replayed
   * or inflated heartbeats can't add more time than really passed. A visit id
   * owned by another user is left alone.
   */
  record(userId: string, visitId: string, activeMs: number): Db<void>;
  /** The last `periods` periods (including the current one), only those with time in them. Everyone when userId is null. */
  buckets(userId: string | null, unit: TimeUnit, periods: number): Db<TimeBucket[]>;
  totals(userId: string | null): Db<VisitTotals>;
  recent(userId: string, limit: number): Db<VisitRow[]>;
}
export class VisitRepository extends Context.Tag("VisitRepository")<VisitRepository, VisitRepositoryShape>() {}

/* ---- Leagues ---- */

export interface LeagueMembership {
  weekStart: string;
  cohortId: string;
  tier: number;
  xp: number;
  result: "promoted" | "stayed" | "demoted" | null;
  finalRank: number | null;
}

export interface LeagueStanding {
  userId: string;
  username: string;
  xp: number;
}

export interface SettledMember {
  userId: string;
  rank: number;
  result: "promoted" | "stayed" | "demoted";
  nextTier: number;
}

export interface LeagueRepositoryShape {
  /** Puts an opted-in learner with a username into a cohort for the week (if not already), with the XP they've earned so far this week. */
  join(userId: string, weekStart: string): Db<LeagueMembership | undefined>;
  /** Adds XP to this week's membership, joining first if needed. No-op unless opted in. */
  addXp(userId: string, xp: number, weekStart: string): Db<void>;
  leave(userId: string, weekStart: string): Db<void>;
  membership(userId: string, weekStart: string): Db<LeagueMembership | undefined>;
  /** The most recent settled week before `weekStart`. */
  lastSettled(userId: string, weekStart: string): Db<LeagueMembership | undefined>;
  /** The cohort in rank order (most XP first, earliest to reach it on ties). */
  standings(cohortId: string): Db<LeagueStanding[]>;
  lifetimeXp(userId: string): Db<number>;
  /** Cohorts from weeks before `weekStart` that haven't been settled. */
  unsettledCohorts(weekStart: string): Db<string[]>;
  /**
   * Settles one cohort atomically (skipping it if another instance holds it):
   * records each member's rank and result, and moves their tier.
   */
  settleCohort(cohortId: string, decide: (ranked: LeagueStanding[], tier: number) => SettledMember[]): Db<{ weekStart: string; tier: number; members: SettledMember[] } | undefined>;
}
export class LeagueRepository extends Context.Tag("LeagueRepository")<LeagueRepository, LeagueRepositoryShape>() {}

/* ---- Admin ---- */

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  hasPassword: boolean;
  google: boolean;
  learningMode: LearningMode;
  createdAt: Date;
  lastActiveAt: Date | null;
  problems: number;
  mastered: number;
  /** Active time on the site, all time. */
  timeMs: number;
}

export interface AdminOverviewRows {
  totals: {
    users: number;
    verified: number;
    onboarded: number;
    signups7: number;
    signups30: number;
    active7: number;
    active30: number;
    problems: number;
    cleanSolves: number;
    timeMs: number;
    sessionsCompleted: number;
  };
  /** Last `days` days, only days with something in them. */
  daily: { day: string; signups: number; activeUsers: number; problems: number; cleanSolves: number }[];
  signIn: { password: number; google: number; both: number };
  modes: { path: number; audit: number };
  levels: { level: number; problems: number; cleanSolves: number }[];
  lessons: { exerciseId: string; learners: number; problems: number; cleanSolves: number; mastered: number }[];
  /** How many learners have mastered n lessons. */
  masteredCounts: { mastered: number; users: number }[];
  leagues: { tier: number; users: number; optedIn: number }[];
}

export interface AdminRepositoryShape {
  overview(courseId: string, days: number, masteredAt: number): Db<AdminOverviewRows>;
  /** Newest first. Matches email, display name or username, case-insensitively. */
  listUsers(opts: { query: string; limit: number; offset: number; masteredAt: number }): Db<{ users: AdminUserRow[]; total: number }>;
  findUser(id: string, masteredAt: number): Db<AdminUserRow | undefined>;
  /** Signs a user out everywhere. Returns how many sessions ended. */
  deleteSessions(userId: string): Db<number>;
}
export class AdminRepository extends Context.Tag("AdminRepository")<AdminRepository, AdminRepositoryShape>() {}

/* ---- Notifications ---- */

export type NotificationFilter = "all" | "unread" | "kept";

export interface NotificationRepositoryShape {
  /** Stores a notification; returns undefined when its dedupe key was already used. */
  create(userId: string, draft: NotificationDraft & { category: NotificationCategory; email: boolean }): Db<Notification | undefined>;
  /** Newest first, excluding dismissed. `before` is the cursor (created_at of the last item seen). */
  list(userId: string, opts: { filter: NotificationFilter; limit: number; before?: { createdAt: Date; id: string } | undefined }): Db<Notification[]>;
  counts(userId: string): Db<{ unseen: number; unread: number; kept: number; total: number }>;
  markAllSeen(userId: string): Db<void>;
  setRead(userId: string, id: string, read: boolean): Db<Notification | undefined>;
  markAllRead(userId: string): Db<number>;
  setKept(userId: string, id: string, kept: boolean): Db<Notification | undefined>;
  dismiss(userId: string, id: string): Db<boolean>;
  /** Dismisses every read notification that isn't kept. */
  dismissRead(userId: string): Db<number>;
  /** Reminders created since a time, for "one nudge a day". */
  countSince(userId: string, category: NotificationCategory, since: Date): Db<number>;
  /** Removes progress notifications (e.g. after a progress reset) so milestones can be earned again. */
  deleteCategory(userId: string, category: NotificationCategory): Db<void>;
  /** Leases a batch of notifications awaiting push delivery so concurrent workers don't double-send. */
  claimPush(limit: number, leaseMs: number): Db<Notification[]>;
  finishPush(id: string, status: "sent" | "skipped" | "failed" | "pending", retryAt?: Date): Db<void>;
  claimEmail(limit: number, leaseMs: number): Db<Notification[]>;
  finishEmail(id: string, status: "sent" | "skipped" | "failed" | "pending", retryAt?: Date): Db<void>;
  /** Deletes dismissed notifications and old read ones that aren't kept. */
  prune(): Db<number>;
}
export class NotificationRepository extends Context.Tag("NotificationRepository")<NotificationRepository, NotificationRepositoryShape>() {}

export interface NewPushSubscription {
  userId: string;
  platform: PushPlatform;
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  userAgent: string | null;
}

export interface PushSubscriptionRepositoryShape {
  /** Registers (or moves to this user) an endpoint/device token. */
  upsert(input: NewPushSubscription): Db<PushSubscription>;
  remove(userId: string, endpoint: string): Db<boolean>;
  listForUser(userId: string): Db<PushSubscription[]>;
  recordResult(id: string, ok: boolean): Db<void>;
  deleteById(id: string): Db<void>;
}
export class PushSubscriptionRepository extends Context.Tag("PushSubscriptionRepository")<PushSubscriptionRepository, PushSubscriptionRepositoryShape>() {}

/** A lease so a background job runs on one API instance at a time. */
export interface JobLeaseRepositoryShape {
  acquire(name: string, holder: string, ttlMs: number): Db<boolean>;
  release(name: string, holder: string): Db<void>;
}
export class JobLeaseRepository extends Context.Tag("JobLeaseRepository")<JobLeaseRepository, JobLeaseRepositoryShape>() {}

export interface ReminderCandidate {
  user: User;
  lastPracticedAt: Date | null;
}
export interface ReminderRepositoryShape {
  /** Verified learners with reminders switched on, with when they last practised. */
  candidates(): Db<ReminderCandidate[]>;
  /** Problems solved and lessons first mastered in the window. */
  activitySince(userId: string, since: Date): Db<{ problems: number; mastered: number }>;
}
export class ReminderRepository extends Context.Tag("ReminderRepository")<ReminderRepository, ReminderRepositoryShape>() {}

export interface PushMessage {
  id: string;
  kind: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string | null;
  /** Unread count, for the app icon badge. */
  badge: number;
}
/** "gone": the endpoint is permanently invalid and should be removed. */
export type PushResult = "ok" | "gone" | "retry" | "unsupported";
export interface PushGatewayShape {
  readonly webPublicKey: string | null;
  readonly enabled: { web: boolean; ios: boolean };
  send(subscription: PushSubscription, message: PushMessage): Effect.Effect<PushResult>;
}
export class PushGateway extends Context.Tag("PushGateway")<PushGateway, PushGatewayShape>() {}
