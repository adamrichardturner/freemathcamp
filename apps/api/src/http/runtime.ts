import { Cause, Effect, Exit, Layer, ManagedRuntime } from "effect";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AppConfig, AppConfigLive } from "../config/config";
import type { PushGateway } from "../application/ports";
import { PushGatewayLive } from "../infrastructure/push/gateway";
import type { AppError } from "../domain/errors";
import { DatabaseLive } from "../infrastructure/db/database";
import { RepositoriesLive } from "../infrastructure/repositories/postgres";
import { EmailSenderLive } from "../infrastructure/email/senders";
import { PasswordHasherLive } from "../infrastructure/security/password";

/** Everything the application layer needs, wired once at startup. Tests can swap the push gateway. */
export const buildAppLayer = (push: Layer.Layer<PushGateway, never, AppConfig> = PushGatewayLive) =>
  Layer.mergeAll(RepositoriesLive, PasswordHasherLive, EmailSenderLive, push).pipe(Layer.provideMerge(DatabaseLive), Layer.provideMerge(AppConfigLive));

export const AppLayer = buildAppLayer();

export type AppServices = Layer.Layer.Success<typeof AppLayer>;
export type AppRuntime = ManagedRuntime.ManagedRuntime<AppServices, unknown>;

export const makeRuntime = (layer: Layer.Layer<AppServices, unknown> = AppLayer): AppRuntime => ManagedRuntime.make(layer);

const STATUS: Record<AppError["_tag"], number> = {
  ValidationError: 400,
  Unauthorized: 401,
  NotFound: 404,
  Conflict: 409,
  RateLimited: 429,
  EmailNotVerified: 403,
  LessonLocked: 403,
  LinkExpired: 410,
  LinkInvalid: 400,
  EmailDeliveryError: 502,
  DatabaseError: 500,
};

const publicMessage = (e: AppError) => {
  switch (e._tag) {
    case "ValidationError":
    case "Unauthorized":
    case "Conflict":
    case "RateLimited":
    case "EmailNotVerified":
    case "LessonLocked":
    case "LinkExpired":
    case "LinkInvalid":
      return e.message;
    case "NotFound":
      return `That ${e.resource} doesn't exist.`;
    case "EmailDeliveryError":
      return "We couldn't send the email just now. Please try again in a minute.";
    case "DatabaseError":
      return "Something went wrong on our side. Please try again.";
  }
};

export const sendError = (res: Response, e: AppError) => {
  if (e._tag === "DatabaseError" || e._tag === "EmailDeliveryError") console.error(`[${e._tag}]`, e.cause);
  res.status(STATUS[e._tag]).json({ error: { code: e._tag, message: publicMessage(e), ...(e._tag === "ValidationError" && e.issues ? { issues: e.issues } : {}) } });
};

/**
 * Adapts an Effect-returning handler to Express. Typed failures map to HTTP
 * statuses; defects become a generic 500 without leaking internals.
 */
export const handle =
  (runtime: AppRuntime) =>
  <A>(fn: (req: Request, res: Response) => Effect.Effect<A, AppError, AppServices>): RequestHandler =>
  async (req: Request, res: Response, _next: NextFunction) => {
    const exit = await runtime.runPromiseExit(fn(req, res));
    if (Exit.isSuccess(exit)) {
      if (!res.headersSent) res.json(exit.value ?? { ok: true });
      return;
    }
    const failure = Cause.failureOption(exit.cause);
    if (failure._tag === "Some") return sendError(res, failure.value as AppError);
    console.error("[defect]", Cause.pretty(exit.cause));
    if (!res.headersSent) res.status(500).json({ error: { code: "Internal", message: "Unexpected error." } });
  };
