"use client";

import { useEffect } from "react";
import { useSession } from "@/hooks/queries";

/*
 * Measures time spent actively on the site and reports it to the API. Time
 * only counts while the tab is visible and the learner has used the mouse,
 * keyboard, touch or scroll in the last couple of minutes (long enough to read
 * a worked example). A visit ends after 30 idle minutes; tabs share one visit.
 */

const TICK_MS = 5_000;
const FLUSH_MS = 30_000;
const IDLE_MS = 2 * 60_000;
const VISIT_GAP_MS = 30 * 60_000;
const STORAGE_KEY = "fmc-visit";
const INPUT_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "scroll", "touchstart"] as const;

interface StoredVisit {
  id: string;
  userId: string;
  lastActiveAt: number;
}

const readVisit = (): StoredVisit | null => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as StoredVisit | null;
  } catch {
    return null;
  }
};

const writeVisit = (visit: StoredVisit) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visit));
  } catch {
    // Private mode or storage blocked: the visit just stays per tab.
  }
};

/** The visit to add time to: the shared one if it's this user's and recent, else a new one. */
let fallback: StoredVisit | null = null;
const currentVisit = (userId: string, now: number) => {
  const stored = readVisit() ?? fallback;
  const visit = stored && stored.userId === userId && now - stored.lastActiveAt < VISIT_GAP_MS ? stored : { id: crypto.randomUUID(), userId, lastActiveAt: now };
  visit.lastActiveAt = now;
  fallback = visit;
  writeVisit(visit);
  return visit.id;
};

export function ActivityTracker() {
  const { user } = useSession();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    let lastInput = Date.now();
    let lastTick = performance.now();
    let pending = 0;
    let visitId: string | null = null;
    // Tracked here rather than read from the document: by the time visibilitychange fires it already says hidden.
    let visible = document.visibilityState === "visible";

    const flush = (keepalive = false) => {
      const activeMs = Math.round(pending);
      if (activeMs < 1000 || !visitId) return;
      pending = 0;
      void fetch("/api/me/activity", {
        method: "POST",
        credentials: "same-origin",
        keepalive,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visitId, activeMs: Math.min(activeMs, 60_000) }),
      }).catch(() => {});
    };

    const tick = () => {
      const now = performance.now();
      // Capped so a suspended laptop or throttled background timer can't add a lump of time.
      const elapsed = Math.min(now - lastTick, TICK_MS * 2);
      lastTick = now;
      if (!visible || Date.now() - lastInput > IDLE_MS) return;
      visitId = currentVisit(userId, Date.now());
      pending += elapsed;
      if (pending >= FLUSH_MS) flush();
    };

    const onInput = () => {
      // Coming back from idle starts the clock afresh rather than counting the idle gap.
      if (Date.now() - lastInput > IDLE_MS) lastTick = performance.now();
      lastInput = Date.now();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        tick();
        visible = false;
        flush(true);
      } else {
        visible = true;
        lastTick = performance.now();
        lastInput = Date.now();
      }
    };
    const onLeave = () => {
      tick();
      flush(true);
    };

    const timer = window.setInterval(tick, TICK_MS);
    for (const e of INPUT_EVENTS) window.addEventListener(e, onInput, { passive: true, capture: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onLeave);
    return () => {
      onLeave();
      window.clearInterval(timer);
      for (const e of INPUT_EVENTS) window.removeEventListener(e, onInput, { capture: true });
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onLeave);
    };
  }, [userId]);

  return null;
}
