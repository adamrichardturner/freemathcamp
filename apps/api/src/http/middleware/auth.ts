import { Effect, Exit } from "effect";
import type { CookieOptions, Request, RequestHandler, Response } from "express";
import { authenticate } from "../../application/auth";
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

/** Attaches `req.user` when a valid session cookie is present. Never rejects. */
export const loadUser =
  (runtime: AppRuntime, secure: boolean): RequestHandler =>
  async (req, res, next) => {
    const token = req.cookies?.[sessionCookieName(secure)];
    if (typeof token !== "string" || token.length < 20 || token.length > 100) return next();
    const exit = await runtime.runPromiseExit(authenticate(token));
    if (Exit.isSuccess(exit)) {
      req.user = exit.value.user;
      req.sessionToken = token;
      if (exit.value.renewedUntil) setSessionCookie(res, secure, token, exit.value.renewedUntil);
    } else {
      clearSessionCookie(res, secure);
    }
    next();
  };

export const requireUser: RequestHandler = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: { code: "Unauthorized", message: "Please sign in to continue." } });
  next();
};

/** For use inside handlers after requireUser. */
export const currentUser = (req: Request) => Effect.sync(() => req.user!);
