import * as Crypto from "expo-crypto";
import { getCalendars } from "expo-localization";
import { useEffect } from "react";
import { AppState } from "react-native";
import { api, type User } from "./api";

/*
 * Time spent actively in the app, reported like the web's ActivityTracker:
 * it only counts while the app is in the foreground and the learner has
 * touched the screen in the last couple of minutes. A visit ends after 30
 * idle minutes.
 */
const TICK_MS = 5_000;
const FLUSH_MS = 30_000;
const IDLE_MS = 2 * 60_000;
const VISIT_GAP_MS = 30 * 60_000;

let lastInput = Date.now();
/** Call on any touch; the root view does. */
export const markInput = () => {
  lastInput = Date.now();
};

export function useActivityTracker(user: User | null) {
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let visit: { id: string; lastActiveAt: number } | null = null;
    let pending = 0;
    let lastTick = Date.now();
    let active = AppState.currentState === "active";

    const flush = () => {
      const activeMs = Math.round(pending);
      if (activeMs < 1000 || !visit) return;
      pending = 0;
      void api.post("/me/activity", { visitId: visit.id, activeMs: Math.min(activeMs, 60_000) }).catch(() => {});
    };
    const tick = () => {
      const now = Date.now();
      const elapsed = Math.min(now - lastTick, TICK_MS * 2);
      lastTick = now;
      if (!active || now - lastInput > IDLE_MS) return;
      if (!visit || now - visit.lastActiveAt > VISIT_GAP_MS) visit = { id: Crypto.randomUUID(), lastActiveAt: now };
      visit.lastActiveAt = now;
      pending += elapsed;
      if (pending >= FLUSH_MS) flush();
    };
    const timer = setInterval(tick, TICK_MS);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        active = true;
        lastTick = Date.now();
        lastInput = Date.now();
      } else if (active) {
        tick();
        active = false;
        flush();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
      flush();
    };
  }, [userId]);
}

/** Reminders go out in the learner's local daytime, so keep their time zone current (as the web does). */
export function useTimezoneSync(user: User | null, update: (timezone: string) => void) {
  useEffect(() => {
    const zone = getCalendars()[0]?.timeZone;
    if (user && zone && user.timezone !== zone) update(zone);
  }, [user, update]);
}
