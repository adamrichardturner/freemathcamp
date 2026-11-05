import type { LearningMode } from "@fmc/curriculum";
import type { ColumnType, Generated, Insertable, Selectable, Updateable } from "kysely";

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;
type Json<T> = ColumnType<T, string, string>;

export interface UsersTable {
  id: Generated<string>;
  email: string;
  display_name: string;
  password_hash: string | null;
  avatar_url: string | null;
  email_verified_at: Timestamp | null;
  daily_goal: Generated<number>;
  learning_mode: Generated<LearningMode>;
  onboarded_at: Timestamp | null;
  timezone: Generated<string>;
  notify_reminders: Generated<boolean>;
  notify_progress: Generated<boolean>;
  notify_email_reminders: Generated<boolean>;
  email_unsubscribe_token: Generated<string>;
  created_at: Generated<Date>;
  last_active_at: Timestamp | null;
  /** IP of the most recent sign-in; a different one raises a new-sign-in notice. */
  last_login_ip: string | null;
  /** Public handle, unique regardless of case. Null until chosen. */
  username: string | null;
  league_opt_in: Generated<boolean>;
  /** Index into TIERS in domain/leagues.ts. */
  league_tier: Generated<number>;
}

export type AccountEventKind = "name_changed" | "username_changed" | "password_changed" | "progress_reset" | "sessions_revoked" | "mode_changed";

export interface AccountEventsTable {
  id: Generated<string>;
  user_id: string;
  kind: AccountEventKind;
  created_at: Generated<Date>;
}

export interface EmailVerificationTokensTable {
  /** SHA-256 of the token in the emailed link. */
  id: string;
  user_id: string;
  expires_at: Timestamp;
  created_at: Generated<Date>;
}

/** Third-party sign-in providers: Google (web and iOS) and Sign in with Apple (iOS). */
export type OAuthProvider = "google" | "apple";

export interface OAuthAccountsTable {
  provider: OAuthProvider;
  provider_user_id: string;
  user_id: string;
  email: string;
  /** Apple only: the refresh token, so deleting the account can revoke it. */
  refresh_token: string | null;
  created_at: Generated<Date>;
}

export interface SessionsTable {
  /** SHA-256 of the session token; the raw token only ever lives in the cookie. */
  id: string;
  user_id: string;
  created_at: Generated<Date>;
  expires_at: Timestamp;
  last_seen_at: Generated<Date>;
  user_agent: string | null;
  ip: string | null;
}

export interface ExerciseProgressTable {
  user_id: string;
  course_id: string;
  exercise_id: string;
  mastery: number;
  struggle: number;
  items_seen: number;
  clean_solves: number;
  wrong_attempts: number;
  reveals: number;
  hints_used: number;
  total_time_ms: number;
  sessions_completed: number;
  ease: number;
  interval_days: number;
  review_count: number;
  due_at: Timestamp | null;
  first_practiced_at: Timestamp | null;
  last_practiced_at: Timestamp | null;
  lesson_viewed_at: Timestamp | null;
  updated_at: Generated<Date>;
}

export interface PracticeItem {
  seed: number;
  level: 1 | 2 | 3;
}

export interface PracticeSessionsTable {
  id: Generated<string>;
  user_id: string;
  course_id: string;
  exercise_id: string;
  mode: "learn" | "review" | "challenge";
  status: "active" | "completed" | "abandoned";
  target_items: number;
  items: Json<PracticeItem[]>;
  mastery_before: number;
  mastery_after: number | null;
  started_at: Generated<Date>;
  completed_at: Timestamp | null;
}

export interface ItemResultsTable {
  session_id: string;
  item_index: number;
  user_id: string;
  course_id: string;
  exercise_id: string;
  level: number;
  wrong_attempts: number;
  revealed: boolean;
  hints_used: number;
  time_ms: number;
  struggle: number;
  clean_solve: boolean;
  mastery_after: number;
  /** League XP earned by this problem (domain/leagues.ts xpFor). */
  xp: Generated<number>;
  resolved_at: Generated<Date>;
}

export interface AttemptsTable {
  id: Generated<string>;
  session_id: string;
  user_id: string;
  item_index: number;
  answer: string;
  correct: boolean;
  time_ms: number;
  created_at: Generated<Date>;
}

export type NotificationCategory = "account" | "progress" | "reminder";
export type PushStatus = "pending" | "sent" | "skipped" | "failed";

export interface NotificationsTable {
  id: Generated<string>;
  user_id: string;
  kind: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string | null;
  data: ColumnType<Record<string, unknown>, string | undefined, string>;
  dedupe_key: string | null;
  created_at: Generated<Date>;
  seen_at: Timestamp | null;
  read_at: Timestamp | null;
  kept_at: Timestamp | null;
  dismissed_at: Timestamp | null;
  push_status: Generated<PushStatus>;
  push_attempts: Generated<number>;
  push_next_at: Generated<Date>;
  email_status: Generated<PushStatus>;
  email_attempts: Generated<number>;
  email_next_at: Generated<Date>;
}

export type PushPlatform = "web" | "ios";

export interface PushSubscriptionsTable {
  id: Generated<string>;
  user_id: string;
  platform: PushPlatform;
  endpoint: string;
  p256dh: string | null;
  auth: string | null;
  user_agent: string | null;
  created_at: Generated<Date>;
  last_success_at: Timestamp | null;
  failure_count: Generated<number>;
}

export interface JobLeasesTable {
  name: string;
  locked_until: Date;
  holder: string;
}

export interface LeagueCohortsTable {
  id: Generated<string>;
  /** Monday (UTC) the week starts, YYYY-MM-DD. */
  week_start: ColumnType<string, string, string>;
  tier: number;
  created_at: Generated<Date>;
  finalized_at: Timestamp | null;
}

export interface LeagueMembersTable {
  week_start: ColumnType<string, string, string>;
  user_id: string;
  cohort_id: string;
  tier: number;
  xp: Generated<number>;
  xp_at: Generated<Date>;
  result: "promoted" | "stayed" | "demoted" | null;
  final_rank: number | null;
}

/** One stretch of use of the site; active_ms only counts time the page was visible and in use. */
export interface SiteVisitsTable {
  id: string;
  user_id: string;
  started_at: Generated<Date>;
  last_seen_at: Generated<Date>;
  active_ms: Generated<number>;
}

export interface DB {
  users: UsersTable;
  oauth_accounts: OAuthAccountsTable;
  email_verification_tokens: EmailVerificationTokensTable;
  account_events: AccountEventsTable;
  sessions: SessionsTable;
  exercise_progress: ExerciseProgressTable;
  practice_sessions: PracticeSessionsTable;
  item_results: ItemResultsTable;
  attempts: AttemptsTable;
  notifications: NotificationsTable;
  push_subscriptions: PushSubscriptionsTable;
  job_leases: JobLeasesTable;
  league_cohorts: LeagueCohortsTable;
  league_members: LeagueMembersTable;
  site_visits: SiteVisitsTable;
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type ExerciseProgress = Selectable<ExerciseProgressTable>;
export type ExerciseProgressUpdate = Updateable<ExerciseProgressTable>;
export type PracticeSession = Selectable<PracticeSessionsTable>;
export type ItemResult = Selectable<ItemResultsTable>;
export type Notification = Selectable<NotificationsTable>;
export type PushSubscription = Selectable<PushSubscriptionsTable>;
