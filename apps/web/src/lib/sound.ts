import { useSyncExternalStore } from "react";

/**
 * Short sound effects for practice. Each file is fetched ahead of time and decoded once into a
 * Web Audio buffer, so it plays instantly and can overlap itself. Browsers only allow audio
 * after the learner interacts with the page, so the audio context is created on the first tap
 * or key press (creating it earlier only gets it suspended, with a console warning); feedback
 * sounds always follow one (clicking Check), so they are never blocked.
 * Where Web Audio is missing, a plain <audio> element is used instead.
 */
const SOUNDS = {
  correct: "/sounds/correct-answer.mp3",
  wrong: "/sounds/wrong-answer.mp3",
} as const;
export type SoundName = keyof typeof SOUNDS;

const VOLUME = 0.6;
const STORAGE_KEY = "fmc:sound-effects";

/* ---------------- Preference (per device) ---------------- */

const listeners = new Set<() => void>();
// The last value set on this page, for when storage is unavailable.
let memory: boolean | null = null;

const readEnabled = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
};

export const soundEffectsEnabled = () => typeof window !== "undefined" && (memory ?? readEnabled());

export function setSoundEffectsEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Storage blocked: the switch still applies until the page reloads.
  }
  memory = on;
  listeners.forEach((l) => l());
  if (on) preloadSounds();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  // Another tab changed it.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    memory = null;
    l();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
};
const snapshot = () => memory ?? readEnabled();

export const useSoundEffects = () => useSyncExternalStore(subscribe, snapshot, () => true);

/* ---------------- Playback ---------------- */

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;
const files = new Map<SoundName, Promise<ArrayBuffer | null>>();
const buffers = new Map<SoundName, Promise<AudioBuffer | null>>();
const fallbacks = new Map<SoundName, HTMLAudioElement>();

const audioContext = (): AudioContext | null => {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC({ latencyHint: "interactive" });
  gain = ctx.createGain();
  gain.gain.value = VOLUME;
  gain.connect(ctx.destination);
  return ctx;
};

// Resume (or create) the context inside a real user gesture, then stop listening.
let unlockArmed = false;
function armUnlock() {
  if (unlockArmed || typeof window === "undefined") return;
  unlockArmed = true;
  const unlock = () => {
    const c = audioContext();
    if (c && c.state !== "running") void c.resume().catch(() => {});
    (Object.keys(SOUNDS) as SoundName[]).forEach((n) => void decode(n));
    if (!c || c.state === "running") remove();
  };
  const events = ["pointerdown", "keydown", "touchend"] as const;
  const remove = () => events.forEach((e) => window.removeEventListener(e, unlock, true));
  events.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
}

const fetchFile = (name: SoundName) => {
  let p = files.get(name);
  if (!p) {
    p = fetch(SOUNDS[name])
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
      .catch(() => {
        files.delete(name); // let a later call retry
        return null;
      });
    files.set(name, p);
  }
  return p;
};

// Decoding needs the audio context, so it waits for the first gesture.
const decode = (name: SoundName) => {
  let p = buffers.get(name);
  if (!p) {
    const c = ctx;
    if (!c) return Promise.resolve(null);
    p = fetchFile(name)
      // decodeAudioData takes ownership of the bytes, so hand it a copy.
      .then((data) => (data ? c.decodeAudioData(data.slice(0)) : null))
      .catch(() => null)
      .then((b) => {
        if (!b) buffers.delete(name);
        return b;
      });
    buffers.set(name, p);
  }
  return p;
};

/** Fetch and decode every sound ahead of time, and get ready to start audio on the next tap. */
export function preloadSounds() {
  if (!soundEffectsEnabled()) return;
  armUnlock();
  (Object.keys(SOUNDS) as SoundName[]).forEach((n) => void (ctx ? decode(n) : fetchFile(n)));
}

function playFallback(name: SoundName) {
  let el = fallbacks.get(name);
  if (!el) {
    el = new Audio(SOUNDS[name]);
    el.preload = "auto";
    el.volume = VOLUME;
    fallbacks.set(name, el);
  }
  el.currentTime = 0;
  void el.play().catch(() => {});
}

export async function playSound(name: SoundName) {
  if (!soundEffectsEnabled()) return;
  const c = audioContext();
  if (!c || !gain) return playFallback(name);
  if (c.state !== "running") await c.resume().catch(() => {});
  const buffer = await decode(name);
  if (!buffer || c.state !== "running") return playFallback(name);
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.connect(gain);
  source.start();
}
