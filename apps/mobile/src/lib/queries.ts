import { unlockedBy, unlockedLessons } from "@fmc/curriculum";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import {
  api,
  session,
  type AccountSettings,
  type Analytics,
  type AppNotification,
  type CompletedToday,
  type CourseProgress,
  type Dashboard,
  type ExerciseDetail,
  type League,
  type NotificationCounts,
  type NotificationFilter,
  type NotificationPage,
  type PracticeMode,
  type Recommendation,
  type SessionSummary,
  type SignedIn,
  type User,
} from "./api";
import { COURSE_ID, graph } from "./course";
import { unregisterPush } from "./push";
import { toast } from "./toast";

/** The same query keys and hooks as the web app (apps/web/src/hooks/queries.ts). */
export const keys = {
  me: ["me"] as const,
  providers: ["providers"] as const,
  progress: ["progress", COURSE_ID] as const,
  dashboard: ["dashboard", COURSE_ID] as const,
  analytics: ["analytics", COURSE_ID] as const,
  exercise: (id: string) => ["exercise", COURSE_ID, id] as const,
  settings: ["settings"] as const,
  league: ["league"] as const,
  notifications: ["notifications"] as const,
  counts: ["notifications", "counts"] as const,
  notificationList: (filter: NotificationFilter) => ["notifications", "list", filter] as const,
};

/**
 * Swaps whose data the cache holds: drops every learner query except the
 * session itself, which screens stay subscribed to (clearing it outright would
 * strand them), then sets the new user or null.
 */
export const switchUser = (qc: QueryClient, user: User | null) => {
  qc.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.me[0] });
  qc.setQueryData(keys.me, user);
};

/** The signed-in user, or null. Without a stored token there's nothing to ask the API. */
export const useMe = () =>
  useQuery({
    queryKey: keys.me,
    queryFn: async () => ((await session.load()) ? api.get<{ user: User | null }>("/auth/me").then((r) => r.user) : null),
    staleTime: 60_000,
  });

export const useSession = () => {
  const me = useMe();
  const user = me.data ?? null;
  // Learner data (progress, practice) is only available once the email is confirmed.
  return { user, ready: !me.isPending, verified: !!user?.emailVerified };
};

/** Which lessons the learner can open: in order in Path mode, all of them in Audit mode. */
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
    known: !verified || !!data,
    isLocked: (id: string) => !!open && !open.has(id),
    lockedBy: (id: string) => unlockedBy(graph, id)?.exercise,
  };
};

export const useProviders = () =>
  useQuery({ queryKey: keys.providers, queryFn: () => api.get<{ google: boolean; apple: boolean; password: boolean }>("/auth/providers"), staleTime: Infinity });

export const useAccountSettings = () => useQuery({ queryKey: keys.settings, queryFn: () => api.get<AccountSettings>("/me/settings") });

export const useCourseProgress = (enabled = true) =>
  useQuery({ queryKey: keys.progress, queryFn: () => api.get<CourseProgress>(`/courses/${COURSE_ID}/progress`), enabled });

export const useDashboard = (enabled = true) =>
  useQuery({ queryKey: keys.dashboard, queryFn: () => api.get<Dashboard>(`/courses/${COURSE_ID}/dashboard`), enabled });

export const useAnalytics = (enabled = true) =>
  useQuery({ queryKey: keys.analytics, queryFn: () => api.get<Analytics>(`/courses/${COURSE_ID}/analytics`), enabled });

export const useExerciseDetail = (id: string, enabled = true) =>
  useQuery({ queryKey: keys.exercise(id), queryFn: () => api.get<ExerciseDetail>(`/courses/${COURSE_ID}/exercises/${id}`), enabled });

export const useLeague = (enabled = true) => useQuery({ queryKey: keys.league, queryFn: () => api.get<League>("/leagues/me"), enabled });

/** Puts an updated user everywhere it's cached, and stays pending until settings agree. */
export const useApplyUser = () => {
  const qc = useQueryClient();
  return (user: User) => {
    qc.setQueryData(keys.me, user);
    qc.setQueryData<AccountSettings>(keys.settings, (s) => s && { ...s, user });
    return qc.invalidateQueries({ queryKey: keys.settings });
  };
};

/** Stores a new session from any sign-in route and shows the signed-in app. */
export const useCompleteSignIn = () => {
  const qc = useQueryClient();
  return async (r: SignedIn) => {
    if (r.session) await session.set(r.session.token);
    switchUser(qc, r.user);
  };
};

export const usePreferences = () => {
  const applyUser = useApplyUser();
  return useMutation({
    mutationFn: (patch: Partial<{ dailyGoal: number; learningMode: "path" | "audit"; notifyReminders: boolean; notifyProgress: boolean; notifyEmailReminders: boolean; timezone: string }>) =>
      api.patch<{ user: User }>("/me/preferences", patch),
    onSuccess: ({ user }) => applyUser(user),
    onError: (e) => toast.error(e, "Couldn't save that setting."),
  });
};

export const useLeagueOptIn = () => {
  const qc = useQueryClient();
  const applyUser = useApplyUser();
  return useMutation({
    mutationFn: (optIn: boolean) => api.put<{ user: User }>("/me/league", { optIn }),
    onSuccess: async ({ user }) => {
      await Promise.all([applyUser(user), qc.invalidateQueries({ queryKey: keys.league })]);
      toast.success(user.leagueOptIn ? "You're in this week's league" : "You've left the leagues");
    },
    onError: (e) => toast.error(e, "Couldn't update your league setting."),
  });
};

/** After practice the whole learner model changes; refresh every view of it. */
export const useInvalidateLearner = () => {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: keys.league }),
      qc.invalidateQueries({ queryKey: keys.progress }),
      qc.invalidateQueries({ queryKey: keys.dashboard }),
      qc.invalidateQueries({ queryKey: keys.analytics }),
      qc.invalidateQueries({ queryKey: ["exercise"] }),
      qc.invalidateQueries({ queryKey: keys.counts }),
    ]);
};

/**
 * A practice session (learn, review or challenge) just finished: tick the lesson
 * off today's plan straight away, as the API will, so the Learn screen never
 * offers it again while the fresh dashboard is on its way; then refresh it all.
 */
export const useSessionCompleted = () => {
  const qc = useQueryClient();
  const invalidate = useInvalidateLearner();
  return (s: SessionSummary, mode: PracticeMode) => {
    const id = s.exerciseId;
    const keep = (r: Recommendation | CompletedToday) => r.exerciseId !== id;
    qc.setQueryData<Dashboard>(keys.dashboard, (d) => {
      if (!d) return d;
      const completed: CompletedToday = { exerciseId: id, mode, mastery: s.mastery.after, completedAt: new Date().toISOString() };
      return {
        ...d,
        queues: Object.fromEntries(Object.entries(d.queues).map(([k, v]) => [k, v.filter(keep)])) as Dashboard["queues"],
        day: { ...d.day, today: d.day.today.filter(keep), upcoming: d.day.upcoming.filter(keep), completed: [completed, ...d.day.completed.filter(keep)] },
      };
    });
    return invalidate();
  };
};

/**
 * Refreshes learner data each time a tab comes back into view (after a lesson,
 * a practice session or anything else pushed over it), without cutting short a
 * refresh that's already under way. The first focus is the mount, which fetches anyway.
 */
export const useRefreshOnFocus = (...queryKeys: QueryKey[]) => {
  const qc = useQueryClient();
  const first = useRef(true);
  const id = JSON.stringify(queryKeys);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      for (const queryKey of JSON.parse(id) as QueryKey[]) void qc.invalidateQueries({ queryKey }, { cancelRefetch: false });
    }, [qc, id]),
  );
};

/** Forgets the session on this device; the API ends it too when it can be reached. */
export const useSignOut = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await unregisterPush().catch(() => {});
      await api.post("/auth/logout").catch(() => {});
      await session.set(null);
    },
    onSettled: () => switchUser(qc, null),
  });
};

/* ---- Notifications ---- */

export const useNotificationCounts = () => {
  const { user } = useSession();
  return useQuery({ queryKey: keys.counts, queryFn: () => api.get<NotificationCounts>("/me/notifications/counts"), enabled: !!user, refetchInterval: 60_000, staleTime: 10_000 });
};

export const useNotifications = (filter: NotificationFilter) =>
  useInfiniteQuery({
    queryKey: keys.notificationList(filter),
    queryFn: ({ pageParam }) => api.get<NotificationPage>(`/me/notifications?filter=${filter}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

/** Applies a change to every cached list, so a notification updates everywhere at once. */
const useUpdateLists = () => {
  const qc = useQueryClient();
  return (f: (n: AppNotification) => AppNotification | null) =>
    qc.setQueriesData<InfiniteData<NotificationPage>>({ queryKey: ["notifications", "list"] }, (data) =>
      data && { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.map(f).filter((n): n is AppNotification => !!n) })) },
    );
};

export const useNotificationActions = () => {
  const qc = useQueryClient();
  const update = useUpdateLists();
  const refresh = () => qc.invalidateQueries({ queryKey: keys.notifications });
  return {
    markRead: useMutation({
      mutationFn: ({ id, read }: { id: string; read: boolean }) => api.patch(`/me/notifications/${id}`, { read }),
      onMutate: ({ id, read }) => update((n) => (n.id === id ? { ...n, read, seen: true } : n)),
      onSettled: refresh,
    }),
    keep: useMutation({
      mutationFn: ({ id, kept }: { id: string; kept: boolean }) => api.patch(`/me/notifications/${id}`, { kept }),
      onMutate: ({ id, kept }) => update((n) => (n.id === id ? { ...n, kept } : n)),
      onSettled: refresh,
    }),
    dismiss: useMutation({
      mutationFn: (id: string) => api.delete(`/me/notifications/${id}`),
      onMutate: (id) => update((n) => (n.id === id ? null : n)),
      onSettled: refresh,
    }),
    readAll: useMutation({ mutationFn: () => api.post("/me/notifications/read-all"), onSettled: refresh }),
    seen: useMutation({ mutationFn: () => api.post<NotificationCounts>("/me/notifications/seen"), onSuccess: (c) => qc.setQueryData(keys.counts, c) }),
  };
};
