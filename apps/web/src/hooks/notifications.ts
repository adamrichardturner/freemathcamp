"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { api, type AppNotification, type NotificationCounts, type NotificationFilter, type NotificationPage, type PushConfig } from "@/lib/api";
import { useSession } from "./queries";
import { useAction } from "@/hooks/use-action";

export const notificationKeys = {
  all: ["notifications"] as const,
  counts: ["notifications", "counts"] as const,
  list: (filter: NotificationFilter) => ["notifications", "list", filter] as const,
  lists: ["notifications", "list"] as const,
  push: ["push", "config"] as const,
  subscription: ["push", "subscription"] as const,
};

/** Unseen/unread counts for the avatar badge. Polled, and refreshed when a push arrives. */
export const useNotificationCounts = () => {
  const { user } = useSession();
  return useQuery({
    queryKey: notificationKeys.counts,
    queryFn: () => api.get<NotificationCounts>("/me/notifications/counts"),
    enabled: !!user,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
};

export const useNotifications = (filter: NotificationFilter, enabled = true) =>
  useInfiniteQuery({
    queryKey: notificationKeys.list(filter),
    queryFn: ({ pageParam }) => api.get<NotificationPage>(`/me/notifications?filter=${filter}${pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : ""}`),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    enabled,
  });

type Pages = InfiniteData<NotificationPage, string | null>;

/** Applies a change to a notification everywhere it's cached, so the UI updates before the server answers. */
const useOptimistic = () => {
  const qc = useQueryClient();
  return {
    apply: async (change: (n: AppNotification) => AppNotification | null, ids: string[] | "all") => {
      await qc.cancelQueries({ queryKey: notificationKeys.lists });
      const snapshot = qc.getQueriesData<Pages>({ queryKey: notificationKeys.lists });
      qc.setQueriesData<Pages>({ queryKey: notificationKeys.lists }, (data) =>
        data && {
          ...data,
          pages: data.pages.map((p) => ({
            ...p,
            items: p.items.flatMap((n) => {
              if (ids !== "all" && !ids.includes(n.id)) return [n];
              const next = change(n);
              return next ? [next] : [];
            }),
          })),
        },
      );
      return snapshot;
    },
    rollback: (snapshot?: [readonly unknown[], Pages | undefined][]) => snapshot?.forEach(([key, data]) => qc.setQueryData(key, data)),
    settle: () => Promise.all([qc.invalidateQueries({ queryKey: notificationKeys.lists }), qc.invalidateQueries({ queryKey: notificationKeys.counts })]),
  };
};

export const useNotificationActions = () => {
  const qc = useQueryClient();
  const o = useOptimistic();

  const seen = useMutation({
    mutationFn: () => api.post<NotificationCounts>("/me/notifications/seen"),
    onSuccess: (counts) => qc.setQueryData(notificationKeys.counts, counts),
  });
  const setRead = useAction({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => api.patch(`/me/notifications/${id}`, { read }),
    onMutate: ({ id, read }) => o.apply((n) => ({ ...n, read, seen: true }), [id]),
    onError: (_e, _v, snap) => o.rollback(snap),
    onSettled: o.settle,
  });
  const setKept = useAction({
    mutationFn: ({ id, kept }: { id: string; kept: boolean }) => api.patch(`/me/notifications/${id}`, { kept }),
    onMutate: ({ id, kept }) => o.apply((n) => ({ ...n, kept }), [id]),
    onError: (_e, _v, snap) => o.rollback(snap),
    onSettled: o.settle,
  });
  const dismiss = useAction({
    mutationFn: (id: string) => api.delete(`/me/notifications/${id}`),
    onMutate: (id) => o.apply(() => null, [id]),
    onError: (_e, _v, snap) => o.rollback(snap),
    onSettled: o.settle,
  });
  const readAll = useAction({
    mutationFn: () => api.post("/me/notifications/read-all"),
    onMutate: () => o.apply((n) => ({ ...n, read: true, seen: true }), "all"),
    onError: (_e, _v, snap) => o.rollback(snap),
    onSettled: o.settle,
  });
  const dismissRead = useAction({
    mutationFn: () => api.post<{ dismissed: number }>("/me/notifications/dismiss-read"),
    onMutate: () => o.apply((n) => (n.read && !n.kept ? null : n), "all"),
    onError: (_e, _v, snap) => o.rollback(snap),
    onSettled: o.settle,
  });
  return { seen, setRead, setKept, dismiss, readAll, dismissRead };
};

/* ---------------- Web Push ---------------- */

export type PushState = "unsupported" | "needs-install" | "denied" | "off" | "on";

const urlBase64ToBytes = (base64: string) => {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
// iPhone and iPad only allow web push from a site added to the Home Screen.
const needsInstall = () =>
  typeof window !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia("(display-mode: standalone)").matches && !pushSupported();

const noop = () => () => {};

/** Push notifications on this device: current state, and switching them on or off. */
export const usePush = () => {
  const qc = useQueryClient();
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const config = useQuery({ queryKey: notificationKeys.push, queryFn: () => api.get<PushConfig>("/me/push/config"), staleTime: Infinity });
  // Whether this browser holds a push subscription (device state, so it lives outside the API).
  const subscription = useQuery({
    queryKey: notificationKeys.subscription,
    queryFn: async () => {
      if (!pushSupported()) return false;
      const reg = await navigator.serviceWorker.getRegistration("/");
      return !!(await reg?.pushManager.getSubscription());
    },
    enabled: hydrated,
    staleTime: Infinity,
  });
  const subscribed = subscription.data ?? null;
  const refresh = () => qc.invalidateQueries({ queryKey: notificationKeys.subscription });

  const enable = useAction({
    mutationFn: async () => {
      const key = config.data?.webPublicKey;
      if (!key) throw new Error("Push isn't set up on the server yet.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error(permission === "denied" ? "Notifications are blocked for this site in your browser settings." : "Permission wasn't granted.");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(key) }));
      const json = sub.toJSON();
      await api.post("/me/push/subscriptions", { platform: "web", endpoint: sub.endpoint, keys: json.keys });
    },
    onSettled: refresh,
  });

  const disable = useAction({
    mutationFn: async () => {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      if (!sub) return;
      await api.delete("/me/push/subscriptions", { endpoint: sub.endpoint });
      await sub.unsubscribe();
    },
    onSettled: refresh,
  });

  const state: PushState | null = !hydrated
    ? null
    : needsInstall()
      ? "needs-install"
      : !pushSupported()
        ? "unsupported"
        : Notification.permission === "denied"
          ? "denied"
          : subscribed === null
            ? null
            : subscribed
              ? "on"
              : "off";

  return { state, available: !!config.data?.web, enable, disable };
};
