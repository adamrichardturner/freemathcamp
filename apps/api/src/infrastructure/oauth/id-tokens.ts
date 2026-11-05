import { Effect, Option } from "effect";
import { createHash, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { AppConfig } from "../../config/config";
import { Unauthorized, ValidationError } from "../../domain/errors";

/**
 * Native sign-in from the iOS app. The app signs in with Google or Apple on the
 * device and sends us the provider's ID token; we check its signature against
 * the provider's published keys, its issuer, its audience (our app) and its
 * expiry, so a token minted for another app can't be replayed here.
 */
export interface ProviderIdentity {
  sub: string;
  /** Apple only includes it if the learner shared it; absent on some later sign-ins. */
  email: string | null;
  name: string;
  picture: string | null;
}

// jose caches the key sets and refetches them when a token names an unknown key.
const GOOGLE_KEYS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const APPLE_KEYS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));

const verify = (token: string, keys: typeof GOOGLE_KEYS, issuer: string[], audience: string | string[], provider: string) =>
  Effect.tryPromise({
    try: () => jwtVerify(token, keys, { issuer, audience, algorithms: ["RS256"] }).then((r) => r.payload),
    catch: () => new Unauthorized({ message: `${provider} sign-in failed. Please try again.` }),
  });

/** Claims providers send as either a boolean or the string "true". */
const isTrue = (v: unknown) => v === true || v === "true";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const sameString = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * The OAuth clients a Google ID token from the app may be issued to. The app
 * names the web client as its server client, so its tokens carry the web
 * client id (GOOGLE_CLIENT_ID) as their audience; GOOGLE_IOS_CLIENT_ID is
 * only needed if a build signs in without it.
 */
const googleAudiences = Effect.map(AppConfig, (c) => [
  ...Option.toArray(Option.map(c.google, (g) => g.clientId)),
  ...Option.toArray(c.googleIosClientId),
]);

export const isGoogleNativeEnabled = Effect.map(googleAudiences, (a) => a.length > 0);

export const verifyGoogleIdToken = (idToken: string) =>
  Effect.gen(function* () {
    const audiences = yield* googleAudiences;
    if (audiences.length === 0) return yield* Effect.fail(new ValidationError({ message: "Google sign-in is not configured." }));
    const claims: JWTPayload & { email?: string; email_verified?: unknown; name?: string; picture?: string } = yield* verify(
      idToken,
      GOOGLE_KEYS,
      ["https://accounts.google.com", "accounts.google.com"],
      audiences,
      "Google",
    );
    if (!claims.sub || !claims.email || !isTrue(claims.email_verified))
      return yield* Effect.fail(new Unauthorized({ message: "Your Google account email must be verified." }));
    return { sub: claims.sub, email: claims.email, name: claims.name ?? "", picture: claims.picture ?? null } satisfies ProviderIdentity;
  });

/**
 * Apple's token carries the SHA-256 of a one-time nonce the app generated for
 * this sign-in; the app sends us the raw nonce, which ties the token to it.
 * Apple shares the learner's name only once, with the first sign-in, so the
 * app passes it along from the credential.
 */
export const verifyAppleIdToken = (input: { identityToken: string; nonce: string; name?: string | undefined }) =>
  Effect.gen(function* () {
    const { appleBundleId } = yield* AppConfig;
    const claims: JWTPayload & { email?: string; email_verified?: unknown; nonce?: string } = yield* verify(
      input.identityToken,
      APPLE_KEYS,
      ["https://appleid.apple.com"],
      appleBundleId,
      "Apple",
    );
    if (!claims.sub || typeof claims.nonce !== "string" || !sameString(claims.nonce, sha256(input.nonce)))
      return yield* Effect.fail(new Unauthorized({ message: "Apple sign-in expired. Please try again." }));
    const email = claims.email && isTrue(claims.email_verified) ? claims.email : null;
    return { sub: claims.sub, email, name: input.name?.trim() ?? "", picture: null } satisfies ProviderIdentity;
  });
