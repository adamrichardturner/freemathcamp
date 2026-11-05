import * as Application from "expo-application";
import * as SecureStore from "expo-secure-store";

/**
 * Typed client for the FreeMathCamp API. The web app reaches it through its
 * own origin with a cookie; the app calls it directly with a bearer token kept
 * in the keychain, and identifies itself with the x-fmc-client header the API
 * requires of origin-less writes.
 */
export type * from "../../../web/src/lib/api";
import type { User } from "../../../web/src/lib/api";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "https://api.freemathcamp.app").replace(/\/$/, "");
/** The site, for links the app hands to the browser (terms, privacy, articles to share). */
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://freemathcamp.app").replace(/\/$/, "");

const TOKEN_KEY = "fmc.session";
let token: string | null | undefined;

export const session = {
  async load() {
    if (token === undefined) token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
    return token;
  },
  async set(value: string | null) {
    token = value;
    if (value) await SecureStore.setItemAsync(TOKEN_KEY, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK });
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
  get current() {
    return token ?? null;
  },
};

/** Called when the API stops recognising the stored session, so the app can return to sign-in. */
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (f: (() => void) | null) => {
  onUnauthorized = f;
};

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

const userAgent = `FreeMathCamp/${Application.nativeApplicationVersion ?? "1.0"} iOS`;

async function request<T>(path: string, init?: { method?: string; json?: unknown }): Promise<T> {
  const auth = await session.load();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "x-fmc-client": "ios",
        "user-agent": userAgent,
        accept: "application/json",
        ...(auth ? { authorization: `Bearer ${auth}` } : {}),
        ...(init?.json !== undefined ? { "content-type": "application/json" } : {}),
      },
      body: init?.json !== undefined ? JSON.stringify(init.json) : undefined,
    });
  } catch {
    throw new ApiError(0, "Offline", "Can't reach FreeMathCamp. Check your connection and try again.");
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = body?.error ?? {};
    if (res.status === 401 && auth) onUnauthorized?.();
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

/** What every sign-in endpoint returns to the app. */
export interface SignedIn {
  user: User;
  session?: { token: string; expiresAt: string };
}

export const errorMessage = (e: unknown, fallback: string) => (e instanceof ApiError ? e.message : fallback);
