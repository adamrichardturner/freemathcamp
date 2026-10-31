import { Effect, Option, Redacted } from "effect";
import { createHash, randomBytes } from "node:crypto";
import { AppConfig } from "../../config/config";
import { Unauthorized, ValidationError } from "../../domain/errors";

/**
 * Google sign-in via the OAuth 2.0 authorization-code flow with PKCE.
 * The browser never sees tokens: the API exchanges the code server-side and
 * reads the profile from Google's userinfo endpoint over TLS.
 */
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

/** Short-lived values stored in an httpOnly cookie between redirect and callback. */
export interface OAuthFlowState {
  state: string;
  verifier: string;
  returnTo: string;
}

const googleConfig = Effect.flatMap(AppConfig, (c) =>
  Option.match(c.google, {
    onNone: () => Effect.fail(new ValidationError({ message: "Google sign-in is not configured." })),
    onSome: (g) => Effect.succeed({ ...g, redirectUri: `${c.webOrigin}/api/auth/google/callback` }),
  }),
);

export const isGoogleEnabled = Effect.map(AppConfig, (c) => Option.isSome(c.google));

/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
export const safeReturnTo = (value: unknown) =>
  typeof value === "string" && /^\/(?!\/)[\w\-/?=&.%]*$/.test(value) ? value : "/learn";

export const beginGoogleFlow = (returnTo: unknown) =>
  Effect.gen(function* () {
    const g = yield* googleConfig;
    const flow: OAuthFlowState = {
      state: randomBytes(24).toString("base64url"),
      verifier: randomBytes(48).toString("base64url"),
      returnTo: safeReturnTo(returnTo),
    };
    const challenge = createHash("sha256").update(flow.verifier).digest("base64url");
    const url = new URL(AUTH_URL);
    url.search = new URLSearchParams({
      client_id: g.clientId,
      redirect_uri: g.redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: flow.state,
      code_challenge: challenge,
      code_challenge_method: "S256",
      prompt: "select_account",
    }).toString();
    return { url: url.toString(), flow };
  });

export const completeGoogleFlow = (params: { code: unknown; state: unknown }, flow: OAuthFlowState | null) =>
  Effect.gen(function* () {
    const g = yield* googleConfig;
    if (!flow || typeof params.state !== "string" || params.state !== flow.state || typeof params.code !== "string")
      return yield* Effect.fail(new Unauthorized({ message: "Google sign-in expired or was tampered with. Please try again." }));

    const token = yield* Effect.tryPromise({
      try: async () => {
        const res = await fetch(TOKEN_URL, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code: params.code as string,
            client_id: g.clientId,
            client_secret: Redacted.value(g.clientSecret),
            redirect_uri: g.redirectUri,
            grant_type: "authorization_code",
            code_verifier: flow.verifier,
          }),
          signal: AbortSignal.timeout(10_000),
        });
        if (!res.ok) throw new Error(`token exchange failed: ${res.status}`);
        return (await res.json()) as { access_token: string };
      },
      catch: () => new Unauthorized({ message: "Google sign-in failed. Please try again." }),
    });

    const profile = yield* Effect.tryPromise({
      try: async () => {
        const res = await fetch(USERINFO_URL, { headers: { authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`userinfo failed: ${res.status}`);
        return (await res.json()) as { sub: string; email?: string; email_verified?: boolean; name?: string; picture?: string };
      },
      catch: () => new Unauthorized({ message: "Couldn't read your Google profile." }),
    });

    if (!profile.email || profile.email_verified !== true)
      return yield* Effect.fail(new Unauthorized({ message: "Your Google account email must be verified." }));

    return { identity: { sub: profile.sub, email: profile.email, name: profile.name ?? "", picture: profile.picture ?? null } satisfies GoogleIdentity, returnTo: flow.returnTo };
  });
