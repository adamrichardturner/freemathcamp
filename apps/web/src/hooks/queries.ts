"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { api, type AccountSettings, type Analytics, type CourseProgress, type Dashboard, type ExerciseDetail, type User } from "@/lib/api";
import { COURSE_ID } from "@/lib/course";

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
