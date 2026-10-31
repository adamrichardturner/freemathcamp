/** Typed client for the FreeMathCamp API (proxied same-origin under /api). */

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
};

/* ---- Response types ---- */

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  emailVerified: boolean;
  createdAt: string;
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

export interface Dashboard {
  queues: Queues;
  stats: {
    streak: Streak;
    today: { problems: number; cleanSolves: number; timeMs: number };
    week: { day: string; problems: number }[];
    exercisesTotal: number;
    exercisesStarted: number;
    exercisesMastered: number;
    reviewsDue: number;
  };
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
  items: { index: number; level: number; struggle: number; cleanSolve: boolean; revealed: boolean; wrongAttempts: number; timeMs: number }[];
  brushUp: string[];
  upNext: Recommendation[];
}
