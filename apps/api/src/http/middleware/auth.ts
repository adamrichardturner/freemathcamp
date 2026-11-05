import { Effect, Exit } from "effect";
import type { CookieOptions, Request, RequestHandler, Response } from "express";
import { authenticate } from "../../application/auth";
import { isAdmin } from "../../domain/admin";
import type { User } from "../../infrastructure/db/schema";
import type { AppRuntime } from "../runtime";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      sessionToken?: string;
    }
  }
}

export const sessionCookieName = (secure: boolean) => (secure ? "__Host-fmc_session" : "fmc_session");

export const cookieOptions = (secure: boolean, expires?: Date): CookieOptions => ({
  httpOnly: true,
  secure,
  sameSite: "lax",
  path: "/",
  ...(expires ? { expires } : {}),
});

export const setSessionCookie = (res: Response, secure: boolean, token: string, expires: Date) =>
  res.cookie(sessionCookieName(secure), token, cookieOptions(secure, expires));

export const clearSessionCookie = (res: Response, secure: boolean) => res.clearCookie(sessionCookieName(secure), cookieOptions(secure));

/**
 * The iOS app sends this header on every request. Browsers can't add a custom
 * header cross-origin without a CORS preflight, which the API never grants, so
 * its presence also proves the request isn't a forged cross-site one.
 */
export const NATIVE_CLIENT_HEADER = "x-fmc-client";
export const isNativeClient = (req: Request) => req.get(NATIVE_CLIENT_HEADER) === "ios";

const bearerToken = (req: Request) => {
  const m = /^Bearer (\S+)$/.exec(req.get("authorization") ?? "");
  return m?.[1];
};

/**
 * Hands a new session to the client: a cookie for the web app, or the token in
 * the body for the native app, which keeps it in the iOS keychain.
 */
export const issueSession = (req: Request, res: Response, secure: boolean, s: { token: string; expiresAt: Date }) => {
  if (isNativeClient(req)) return { session: { token: s.token, expiresAt: s.expiresAt.toISOString() } };
  setSessionCookie(res, secure, s.token, s.expiresAt);
  return {};
};

/** Attaches `req.user` when a valid session cookie (or, from the app, a bearer token) is present. Never rejects. */
export const loadUser =
  (runtime: AppRuntime, secure: boolean): RequestHandler =>
  async (req, res, next) => {
    const bearer = isNativeClient(req) ? bearerToken(req) : undefined;
    const token = bearer ?? req.cookies?.[sessionCookieName(secure)];
    if (typeof token !== "string" || token.length < 20 || token.length > 100) return next();
    const exit = await runtime.runPromiseExit(authenticate(token));
    if (Exit.isSuccess(exit)) {
      req.user = exit.value.user;
      req.sessionToken = token;
      // Bearer sessions slide on the server alone; there's no cookie to refresh.
      if (exit.value.renewedUntil && !bearer) setSessionCookie(res, secure, token, exit.value.renewedUntil);
    } else if (!bearer) {
      clearSessionCookie(res, secure);
    }
    next();
  };

export const requireUser: RequestHandler = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: { code: "Unauthorized", message: "Please sign in to continue." } });
  next();
};

/** Learner features need a confirmed email (Google accounts are confirmed on sign-up). */
export const requireVerified: RequestHandler = (req, res, next) => {
  if (!req.user?.email_verified_at)
    return res.status(403).json({ error: { code: "EmailNotVerified", message: "Confirm your email to start practising." } });
  next();
};

/** The admin panel: signed in as the one admin account, or refused. Enforced here, never only in the web app. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: { code: "Unauthorized", message: "Please sign in to continue." } });
  if (!isAdmin(req.user)) return res.status(403).json({ error: { code: "Forbidden", message: "You don't have access to this page." } });
  next();
};

/** For use inside handlers after requireUser. */
export const currentUser = (req: Request) => Effect.sync(() => req.user!);
