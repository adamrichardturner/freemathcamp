import { Cause, Effect, Exit } from "effect";
import { Router, type Request } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { login, loginWithGoogle, loginWithProvider, logout, register, rememberAppleSignIn, signInVerified, toPublicUser } from "../../application/auth";
import { sendVerificationEmail, verifyEmail } from "../../application/email-verification";
import { checkResetToken, requestPasswordReset, resetPassword } from "../../application/password-reset";
import { beginGoogleFlow, completeGoogleFlow, isGoogleEnabled, type OAuthFlowState } from "../../infrastructure/oauth/google";
import { isGoogleNativeEnabled, verifyAppleIdToken, verifyGoogleIdToken } from "../../infrastructure/oauth/id-tokens";
import { clearSessionCookie, cookieOptions, currentUser, isNativeClient, issueSession, requireUser, setSessionCookie } from "../middleware/auth";
import { handle, type AppRuntime } from "../runtime";
import { usernameAvailability } from "../../application/account";
import {
  AppleIdTokenBody,
  decode,
  ForgotPasswordBody,
  GoogleIdTokenBody,
  LoginBody,
  RegisterBody,
  ResetPasswordBody,
  ResetTokenBody,
  UsernameQuery,
  VerifyEmailBody,
} from "../validation";

const OAUTH_COOKIE = "fmc_oauth";

const clientInfo = (req: Request) => ({ userAgent: req.get("user-agent") ?? null, ip: req.clientIp });

const readFlow = (raw: unknown): OAuthFlowState | null => {
  if (typeof raw !== "string" || raw.length > 1000) return null;
  try {
    const v = JSON.parse(raw) as OAuthFlowState;
    return typeof v.state === "string" && typeof v.verifier === "string" && typeof v.returnTo === "string" ? v : null;
  } catch {
    return null;
  }
};

export const authRoutes = (runtime: AppRuntime, opts: { secure: boolean; webOrigin: string }) => {
  const router = Router();
  const h = handle(runtime);

  // Brute-force protection: per IP + email for logins, per IP for sign-ups.
  const loginLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKeyGenerator(req.clientIp)}:${String(req.body?.email ?? "").toLowerCase().slice(0, 254)}`,
    message: { error: { code: "RateLimited", message: "Too many attempts. Please wait a few minutes." } },
  });
  const signupLimiter = rateLimit({
    windowMs: 60 * 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.clientIp),
    message: { error: { code: "RateLimited", message: "Too many sign-ups from this network. Try again later." } },
  });

  // Reset emails: a few per address, and a cap per network so nobody can spam many inboxes.
  const forgotLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKeyGenerator(req.clientIp)}:${String(req.body?.email ?? "").trim().toLowerCase().slice(0, 254)}`,
    message: { error: { code: "RateLimited", message: "Too many reset requests. Please wait a few minutes and check your inbox (and spam)." } },
  });
  const forgotNetworkLimiter = rateLimit({
    windowMs: 60 * 60_000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.clientIp),
    message: { error: { code: "RateLimited", message: "Too many reset requests from this network. Try again later." } },
  });
  // Guessing a 256-bit token is hopeless, but there's no reason to allow trying.
  const resetLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    keyGenerator: (req) => ipKeyGenerator(req.clientIp),
    message: { error: { code: "RateLimited", message: "Too many attempts. Please wait a few minutes." } },
  });

  // Live feedback while choosing a username, at sign-up or later.
  router.get("/username-available", h((req) => Effect.flatMap(decode(UsernameQuery, req.query), (q) => usernameAvailability(q.username, req.user))));

  // The web app signs in with Google by redirect; the iOS app with an ID token (and with Apple, always).
  router.get(
    "/providers",
    h((req) => (isNativeClient(req) ? Effect.map(isGoogleNativeEnabled, (google) => ({ google, apple: true, password: true })) : Effect.map(isGoogleEnabled, (google) => ({ google, apple: false, password: true })))),
  );

  router.post(
    "/register",
    signupLimiter,
    h((req, res) =>
      Effect.gen(function* () {
        const body = yield* decode(RegisterBody, req.body);
        const s = yield* register(body, clientInfo(req));
        res.status(201);
        return { user: s.user, ...issueSession(req, res, opts.secure, s) };
      }),
    ),
  );

  router.post(
    "/login",
    loginLimiter,
    h((req, res) =>
      Effect.gen(function* () {
        const body = yield* decode(LoginBody, req.body);
        const s = yield* login(body, clientInfo(req));
        return { user: s.user, ...issueSession(req, res, opts.secure, s) };
      }),
    ),
  );

  router.post(
    "/logout",
    h((req, res) =>
      Effect.gen(function* () {
        if (req.sessionToken) yield* logout(req.sessionToken);
        clearSessionCookie(res, opts.secure);
        return { ok: true };
      }),
    ),
  );

  router.post(
    "/verify-email",
    loginLimiter,
    h((req, res) =>
      Effect.gen(function* () {
        const { token } = yield* decode(VerifyEmailBody, req.body);
        const user = yield* verifyEmail(token);
        // The link proves control of the inbox, so sign in whoever opened it.
        if (req.user?.id !== user.id) {
          const s = yield* signInVerified(user, clientInfo(req));
          return { user: toPublicUser(user), ...issueSession(req, res, opts.secure, s) };
        }
        return { user: toPublicUser(user) };
      }),
    ),
  );

  // Same answer, just as fast, whether or not the address has an account: the
  // lookup and the email happen after the response, so timing gives nothing away.
  router.post(
    "/forgot-password",
    forgotNetworkLimiter,
    forgotLimiter,
    h((req) =>
      Effect.gen(function* () {
        const { email } = yield* decode(ForgotPasswordBody, req.body);
        yield* Effect.forkDaemon(requestPasswordReset(email).pipe(Effect.catchAll((e) => Effect.logWarning("password reset email failed", e))));
        return { ok: true };
      }),
    ),
  );

  router.post(
    "/reset-password/check",
    resetLimiter,
    h((req) => Effect.flatMap(decode(ResetTokenBody, req.body), ({ token }) => checkResetToken(token))),
  );

  router.post(
    "/reset-password",
    resetLimiter,
    h((req, res) =>
      Effect.gen(function* () {
        const body = yield* decode(ResetPasswordBody, req.body);
        const { user, signedOutSessions } = yield* resetPassword(body);
        // Every old session has ended; sign in whoever just proved control of the inbox.
        const s = yield* signInVerified(user, clientInfo(req));
        return { user: s.user, signedOutSessions, ...issueSession(req, res, opts.secure, s) };
      }),
    ),
  );

  router.post(
    "/resend-verification",
    requireUser,
    h((req) => Effect.flatMap(currentUser(req), (user) => sendVerificationEmail(user))),
  );

  // Native sign-in from the iOS app: the provider's ID token, verified here.
  router.post(
    "/google/id-token",
    loginLimiter,
    h((req, res) =>
      Effect.gen(function* () {
        const { idToken } = yield* decode(GoogleIdTokenBody, req.body);
        const identity = yield* verifyGoogleIdToken(idToken);
        const s = yield* loginWithProvider("google", identity, clientInfo(req));
        return { user: s.user, ...issueSession(req, res, opts.secure, s) };
      }),
    ),
  );

  router.post(
    "/apple",
    loginLimiter,
    h((req, res) =>
      Effect.gen(function* () {
        const body = yield* decode(AppleIdTokenBody, req.body);
        const identity = yield* verifyAppleIdToken(body);
        const s = yield* loginWithProvider("apple", identity, clientInfo(req));
        yield* rememberAppleSignIn(identity.sub, body.authorizationCode);
        return { user: s.user, ...issueSession(req, res, opts.secure, s) };
      }),
    ),
  );

  router.get("/me", h((req) => Effect.succeed({ user: req.user ? toPublicUser(req.user) : null })));

  // Google OAuth: a top-level browser navigation, so it redirects instead of returning JSON.
  router.get("/google", loginLimiter, async (req, res) => {
    const exit = await runtime.runPromiseExit(beginGoogleFlow(req.query.returnTo));
    if (Exit.isFailure(exit)) return res.redirect(303, `${opts.webOrigin}/login?error=google_unavailable`);
    res.cookie(OAUTH_COOKIE, JSON.stringify(exit.value.flow), { ...cookieOptions(opts.secure, new Date(Date.now() + 10 * 60_000)), path: "/api/auth/google" });
    res.redirect(303, exit.value.url);
  });

  router.get("/google/callback", async (req, res) => {
    const flow = readFlow(req.cookies?.[OAUTH_COOKIE]);
    res.clearCookie(OAUTH_COOKIE, { ...cookieOptions(opts.secure), path: "/api/auth/google" });
    if (typeof req.query.error === "string") return res.redirect(303, `${opts.webOrigin}/login?error=google_cancelled`);
    const exit = await runtime.runPromiseExit(
      Effect.gen(function* () {
        const { identity, returnTo } = yield* completeGoogleFlow({ code: req.query.code, state: req.query.state }, flow);
        const s = yield* loginWithGoogle(identity, clientInfo(req));
        return { ...s, returnTo };
      }),
    );
    if (Exit.isFailure(exit)) {
      const failure = Cause.failureOption(exit.cause);
      const conflict = failure._tag === "Some" && (failure.value as { _tag?: string })._tag === "Conflict";
      return res.redirect(303, `${opts.webOrigin}/login?error=${conflict ? "account_exists" : "google_failed"}`);
    }
    setSessionCookie(res, opts.secure, exit.value.token, exit.value.expiresAt);
    res.redirect(303, `${opts.webOrigin}${exit.value.returnTo}`);
  });

  return router;
};
