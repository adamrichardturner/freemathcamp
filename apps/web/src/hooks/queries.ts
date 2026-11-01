"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { unlockedBy, unlockedLessons } from "@fmc/curriculum";
import { useMemo, useSyncExternalStore } from "react";
import { api, type AccountSettings, type Analytics, type CourseProgress, type Dashboard, type ExerciseDetail, type User } from "@/lib/api";
import { COURSE_ID, graph } from "@/lib/course";

export const keys = {
  me: ["me"] as const,
  providers: ["providers"] as const,
  progress: ["progress", COURSE_ID] as const,
  dashboard: ["dashboard", COURSE_ID] as const,
  analytics: ["analytics", COURSE_ID] as const,
  exercise: (id: string) => ["exercise", COURSE_ID, id] as const,
  settings: ["settings"] as const,
};

export const useMe = () =>
  useQuery({ queryKey: keys.me, queryFn: () => api.get<{ user: User | null }>("/auth/me").then((r) => r.user), staleTime: 60_000 });

const noopSubscribe = () => () => {};

/**
 * The signed-in user, safe to branch on during render. While hydrating it
 * reports the server's view (unknown) — sections stream in and hydrate at
 * different times, so reading the live cache there would mismatch the HTML.
 */
export const useSession = () => {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const me = useMe();
  const user = hydrated ? (me.data ?? null) : null;
  // Learner data (progress, practice) is only available once the email is confirmed.
  return { user, ready: hydrated && !me.isPending, verified: !!user?.emailVerified };
};

/**
 * Which lessons the learner can open. Path mode opens them in order; audit mode
 * (and signed-out browsing) opens everything. Until progress loads nothing is
 * shown as locked, so links never flash a lock that isn't real.
 */
export const useLessonAccess = () => {
  const { user, verified } = useSession();
  const { data } = useCourseProgress(verified);
  const mode = user?.learningMode ?? "path";
  const open = useMemo(() => {
    if (!verified || !data || mode === "audit") return null;
    const byId = new Map(data.exercises.map((e) => [e.exerciseId, e]));
    return unlockedLessons(graph, mode, (id) => byId.get(id));
  }, [verified, data, mode]);
  return {
    mode,
    /** Whether the switch between modes can be shown (it needs a verified account to save). */
    canChooseMode: verified,
    /** False while a signed-in learner's progress is still loading, i.e. locks aren't known yet. */
    known: !verified || !!data,
    isLocked: (id: string) => !!open && !open.has(id),
    lockedBy: (id: string) => unlockedBy(graph, id)?.exercise,
  };
};

export const useAccountSettings = () => useQuery({ queryKey: keys.settings, queryFn: () => api.get<AccountSettings>("/me/settings") });

export const useProviders = () =>
  useQuery({ queryKey: keys.providers, queryFn: () => api.get<{ google: boolean; password: boolean }>("/auth/providers"), staleTime: Infinity });

export const useCourseProgress = (enabled = true) =>
  useQuery({ queryKey: keys.progress, queryFn: () => api.get<CourseProgress>(`/courses/${COURSE_ID}/progress`), enabled });

export const useDashboard = (enabled = true) =>
  useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<Dashboard>(`/courses/${COURSE_ID}/dashboard`), enabled });

export const useAnalytics = (enabled = true) =>
  useQuery({ queryKey: keys.analytics, queryFn: () => api.get<Analytics>(`/courses/${COURSE_ID}/analytics`), enabled });

export const useExerciseDetail = (id: string, enabled = true) =>
  useQuery({ queryKey: keys.exercise(id), queryFn: () => api.get<ExerciseDetail>(`/courses/${COURSE_ID}/exercises/${id}`), enabled });

/** After practice the whole learner model changes; refresh every view of it. */
export const useInvalidateLearner = () => {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.progress }),
      qc.invalidateQueries({ queryKey: keys.dashboard }),
      qc.invalidateQueries({ queryKey: keys.analytics }),
      qc.invalidateQueries({ queryKey: ["exercise"] }),
    ]);
};

export const useLogout = () => {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      qc.clear();
      router.push("/");
      router.refresh();
    },
  });
};
