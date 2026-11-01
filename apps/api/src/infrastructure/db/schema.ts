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
  created_at: Generated<Date>;
  last_active_at: Timestamp | null;
}

export type AccountEventKind = "name_changed" | "password_changed" | "progress_reset" | "sessions_revoked" | "mode_changed";

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

export interface OAuthAccountsTable {
  provider: "google";
  provider_user_id: string;
  user_id: string;
  email: string;
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
}

export type User = Selectable<UsersTable>;
export type NewUser = Insertable<UsersTable>;
export type ExerciseProgress = Selectable<ExerciseProgressTable>;
export type ExerciseProgressUpdate = Updateable<ExerciseProgressTable>;
export type PracticeSession = Selectable<PracticeSessionsTable>;
export type ItemResult = Selectable<ItemResultsTable>;
