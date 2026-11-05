import { Effect, Option, Redacted } from "effect";
import { createPrivateKey, sign } from "node:crypto";
import { AppConfig } from "../../config/config";

/**
 * Sign in with Apple's server endpoints. Signing in only needs the identity
 * token (see id-tokens.ts); these keep a refresh token per account so that
 * deleting the account can revoke the app's access, which Apple requires of
 * apps offering Sign in with Apple.
 */
const TOKEN_URL = "https://appleid.apple.com/auth/token";
const REVOKE_URL = "https://appleid.apple.com/auth/revoke";

const base64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** The client secret Apple asks for: a short-lived ES256 JWT signed with a Sign in with Apple key. */
export const appleClientSecret = (key: { teamId: string; keyId: string; privateKey: string }, clientId: string, now = Date.now()) => {
  const iat = Math.floor(now / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: "ES256", kid: key.keyId }))}.${base64url(
    JSON.stringify({ iss: key.teamId, iat, exp: iat + 300, aud: "https://appleid.apple.com", sub: clientId }),
  )}`;
  const signature = sign("sha256", Buffer.from(unsigned), { key: createPrivateKey(key.privateKey.replace(/\\n/g, "\n")), dsaEncoding: "ieee-p1363" });
  return `${unsigned}.${base64url(signature)}`;
};

/** The app's client id and a fresh client secret, or none when no key is configured. */
const credentials = Effect.map(AppConfig, (c) =>
  Option.map(c.appleSignInKey, (k) => ({
    client_id: c.appleBundleId,
    client_secret: appleClientSecret({ teamId: k.teamId, keyId: k.keyId, privateKey: Redacted.value(k.privateKey) }, c.appleBundleId),
  })),
);

const post = (url: string, form: Record<string, string>) =>
  Effect.tryPromise({
    try: async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(form),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`${url} answered ${res.status}: ${await res.text().catch(() => "")}`.slice(0, 300));
      return res.status === 200 ? ((await res.json().catch(() => ({}))) as Record<string, unknown>) : {};
    },
    catch: (e) => (e instanceof Error ? e : new Error(String(e))),
  });

/** Exchanges the authorization code from a sign-in for a refresh token; null without a key. */
export const exchangeAppleCode = (code: string) =>
  Effect.gen(function* () {
    const creds = yield* credentials;
    if (Option.isNone(creds)) return null;
    const body = yield* post(TOKEN_URL, { ...creds.value, code, grant_type: "authorization_code" });
    return typeof body.refresh_token === "string" ? body.refresh_token : null;
  });

/** Revokes a refresh token, ending the app's access to that Apple ID. False without a key. */
export const revokeAppleToken = (token: string) =>
  Effect.gen(function* () {
    const creds = yield* credentials;
    if (Option.isNone(creds)) return false;
    yield* post(REVOKE_URL, { ...creds.value, token, token_type_hint: "refresh_token" });
    return true;
  });
