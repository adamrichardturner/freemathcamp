"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { notificationKeys, useNotificationActions } from "@/hooks/notifications";
import { keys, useSession } from "@/hooks/queries";
import { api, type User } from "@/lib/api";

/**
 * Background glue for notifications, rendered once in the app shell:
 * - keeps the learner's time zone current so reminders arrive at sensible local times;
 * - refreshes the badge the moment a push arrives in an open tab;
 * - marks a notification read when the app was opened from its push (?notification=…).
 */
export function NotificationBridge() {
  const { user } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { setRead } = useNotificationActions();

  const syncZone = useMutation({
    mutationFn: (timezone: string) => api.patch<{ user: User }>("/me/preferences", { timezone }),
    onSuccess: ({ user: u }) => qc.setQueryData(keys.me, u),
  });
  const synced = useRef(false);
  const { mutate: sendZone } = syncZone;
  useEffect(() => {
    if (!user || synced.current) return;
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    synced.current = true;
    if (zone && zone !== user.timezone) sendZone(zone);
  }, [user, sendZone]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (e: MessageEvent<{ type?: string }>) => {
      if (e.data?.type === "fmc:push") void qc.invalidateQueries({ queryKey: notificationKeys.all });
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [qc]);

  const opened = params.get("notification");
  const { mutate: markRead } = setRead;
  useEffect(() => {
    if (!user || !opened || !/^[0-9a-f-]{36}$/.test(opened)) return;
    markRead({ id: opened, read: true });
    const rest = new URLSearchParams(params);
    rest.delete("notification");
    router.replace(`${pathname}${rest.size ? `?${rest}` : ""}`, { scroll: false });
  }, [user, opened, params, pathname, router, markRead]);

  return null;
}
