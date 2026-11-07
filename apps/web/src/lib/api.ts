/** Typed client for the FreeMathCamp API (proxied same-origin under /api). */

import type { LearningMode } from "@fmc/curriculum";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public issues?: { path: string; message: string }[],
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...rest.headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error ?? {};
    throw new ApiError(res.status, e.code ?? "Error", e.message ?? `Request failed (${res.status})`, e.issues);
  }
  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, json: unknown = {}) => request<T>(path, { method: "POST", json }),
  patch: <T>(path: string, json: unknown) => request<T>(path, { method: "PATCH", json }),
  put: <T>(path: string, json: unknown) => request<T>(path, { method: "PUT", json }),
  delete: <T>(path: string, json: unknown = {}) => request<T>(path, { method: "DELETE", json }),
};

/* ---- Response types ---- */

export interface User {
  id: string;
  email: string;
  displayName: string;
  /** Null until chosen; the app asks for one after sign-in. */
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
  isAdmin: boolean;
  createdAt: string;
}

export interface AccountSettings {
  user: User;
  security: { activeSessions: number; otherSessions: number; linkedProviders: string[] };
  nameChanges: { remaining: number; limit: number; nextAllowedAt: string | null };
}

export type ExerciseStatus = "new" | "learning" | "struggling" | "review" | "mastered";

export interface ProgressView {
  exerciseId: string;
  status: ExerciseStatus;
  mastery: number;
  effectiveMastery: number;
  struggle: number;
  itemsSeen: number;
  cleanSolves: number;
  sessionsCompleted: number;
  totalTimeMs: number;
  dueAt: string | null;
  lastPracticedAt: string | null;
  lessonViewedAt: string | null;
}

export interface CourseProgress {
  courseId: string;
  exercises: ProgressView[];
  units: { unitId: string; total: number; started: number; mastered: number; mastery: number }[];
}

export type QueueKind = "review" | "challenge" | "next" | "continue";

export interface Recommendation {
  exerciseId: string;
  kind: QueueKind;
  priority: number;
  reason: string;
  brushUp?: string[];
  effectiveMastery: number;
}

export interface Queues {
  review: Recommendation[];
  challenge: Recommendation[];
  next: Recommendation[];
  continue: Recommendation[];
  plan: Recommendation[];
}

export interface Streak {
  current: number;
  longest: number;
  activeToday: boolean;
}

export interface CompletedToday {
  exerciseId: string;
  mode: "learn" | "review" | "challenge";
  mastery: number;
  completedAt: string;
}

/** Today's plan sized to the daily goal; once it's met `today` stays empty and the rest waits in `upcoming`. */
export interface DayPlan {
  goal: number;
  done: number;
  complete: boolean;
  today: Recommendation[];
  upcoming: Recommendation[];
  completed: CompletedToday[];
}

export interface Dashboard {
  queues: Queues;
  day: DayPlan;
  stats: {
    streak: Streak;
    today: { problems: number; cleanSolves: number; timeMs: number };
    week: { day: string; problems: number }[];
    exercisesTotal: number;
    exercisesStarted: number;
    exercisesMastered: number;
    problemsSolved: number;
    reviewsDue: number;
    time: { todayMinutes: number; weekMinutes: number; week: { day: string; minutes: number }[] };
  };
}

/** Minutes active on the site in one period; `period` is its first day (weeks start on Monday). */
export interface TimePeriod {
  period: string;
  minutes: number;
  visits: number;
  users: number;
}

export interface TimeSeries {
  daily: TimePeriod[];
  weekly: TimePeriod[];
  monthly: TimePeriod[];
}

export interface TimeTotals {
  minutes: number;
  visits: number;
  avgVisitMinutes: number;
  todayMinutes: number;
  last7Minutes: number;
  last30Minutes: number;
}

export interface LearnerTime extends TimeSeries {
  totals: TimeTotals;
  recentVisits: { id: string; startedAt: string; lastSeenAt: string; minutes: number }[];
}

export interface Analytics {
  totals: {
    problems: number;
    cleanSolves: number;
    accuracy: number;
    timeMs: number;
    hintsUsed: number;
    reveals: number;
    sessions: number;
    exercisesStarted: number;
    exercisesMastered: number;
    exercisesTotal: number;
    streak: Streak;
  };
  daily: { day: string; problems: number; accuracy: number; minutes: number; struggle: number }[];
  units: { unitId: string; title: string; mastery: number; struggle: number; started: number; total: number }[];
  levels: { level: number; problems: number; accuracy: number }[];
  strongest: (ProgressView & { title: string })[];
  weakest: (ProgressView & { title: string })[];
  recentSessions: { id: string; exerciseId: string; title: string; mode: string; completedAt: string | null; masteryBefore: number; masteryAfter: number | null }[];
  queues: Queues;
  time: LearnerTime;
}

export interface ExerciseDetail {
  progress: ProgressView | null;
  prerequisites: { exerciseId: string; status: ExerciseStatus; mastery: number }[];
  timeline: { at: string; mastery: number; struggle: number }[];
  sessions: { id: string; mode: string; completedAt: string | null; masteryBefore: number; masteryAfter: number | null }[];
}

export type Level = 1 | 2 | 3;
export type PracticeMode = "learn" | "review" | "challenge";

export interface PracticeItem {
  index: number;
  seed: number;
  level: Level;
}

export interface StartPracticeResponse {
  sessionId: string;
  mode: PracticeMode;
  targetItems: number;
  item: PracticeItem;
  mastery: number;
  expectedSeconds: number;
}

export interface Resolution {
  struggle: number;
  cleanSolve: boolean;
  mastery: { before: number; after: number };
  levelChange: number;
  /** League XP this problem earned. */
  xp: number;
  next: PracticeItem | null;
  done: boolean;
}

export type AttemptResponse =
  | { correct: false; feedback: string | null; wrongAttempts: number }
  | ({ correct: true; feedback: null; wrongAttempts: number } & Resolution);

export type RevealResponse = { answer: string } & Resolution;

export interface SessionSummary {
  sessionId: string;
  exerciseId: string;
  problems: number;
  accuracy: number;
  meanStruggle: number;
  quality: number;
  totalTimeMs: number;
  mastery: { before: number; after: number };
  nextReviewAt: string;
  intervalDays: number;
  items: { index: number; seed: number; level: 1 | 2 | 3; struggle: number; cleanSolve: boolean; revealed: boolean; wrongAttempts: number; hintsUsed: number; timeMs: number }[];
  brushUp: string[];
  upNext: Recommendation[];
}

export type NotificationCategory = "account" | "progress" | "reminder";

export interface AppNotification {
  id: string;
  kind: string;
  category: NotificationCategory;
  title: string;
  body: string;
  href: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  seen: boolean;
  read: boolean;
  kept: boolean;
}

export interface NotificationCounts {
  unseen: number;
  unread: number;
  kept: number;
  total: number;
}

export type NotificationFilter = "all" | "unread" | "kept";

export interface NotificationPage {
  items: AppNotification[];
  nextCursor: string | null;
  counts: NotificationCounts;
}

export interface PushConfig {
  webPublicKey: string | null;
  web: boolean;
  ios: boolean;
}

/* ---- Leagues ---- */

export type LeagueResult = "promoted" | "stayed" | "demoted";

export interface LeagueTier {
  index: number;
  name: string;
}

export interface League {
  optedIn: boolean;
  username: string | null;
  tier: LeagueTier;
  tiers: string[];
  lifetimeXp: number;
  week: { start: string; endsAt: string };
  cohort: {
    rank: number;
    size: number;
    xp: number;
    promote: number;
    demote: number;
    promotionMinXp: number | null;
    members: { rank: number; username: string; xp: number; you: boolean }[];
  } | null;
  lastWeek: { weekStart: string; tier: LeagueTier; result: LeagueResult | null; rank: number | null } | null;
}

/* ---- Admin ---- */

export interface AdminOverview {
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
    accuracy: number;
    timeMs: number;
    sessionsCompleted: number;
  };
  daily: { day: string; signups: number; activeUsers: number; problems: number; accuracy: number | null }[];
  signIn: { password: number; google: number; both: number };
  modes: { path: number; audit: number };
  levels: { level: number; problems: number; accuracy: number | null }[];
  lessons: { exerciseId: string; title: string; unit: string; learners: number; problems: number; accuracy: number | null; mastered: number }[];
  progress: { label: string; users: number }[];
  leagues: { tier: string; users: number; optedIn: number }[];
  time: TimeSeries & { totals: TimeTotals & { learners: number; learners30: number; avgPerLearner30Minutes: number } };
}

export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  signIn: "password" | "google" | "both";
  learningMode: LearningMode;
  createdAt: string;
  lastActiveAt: string | null;
  problems: number;
  mastered: number;
  /** Active time on the site, all time. */
  timeMs: number;
  isAdmin: boolean;
}

export interface AdminUserPage {
  users: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminUserDetail {
  user: AdminUser & { timezone: string; dailyGoal: number; onboarded: boolean; lastLoginIp: string | null };
  stats: {
    streak: Streak;
    started: number;
    mastered: number;
    totalLessons: number;
    last30: { problems: number; accuracy: number | null; timeMs: number };
    progressResets: number;
  };
  daily: { day: string; problems: number }[];
  time: LearnerTime;
  sessions: { id: string; exerciseId: string; title: string; mode: string; completedAt: string | null; masteryBefore: number; masteryAfter: number | null }[];
}
