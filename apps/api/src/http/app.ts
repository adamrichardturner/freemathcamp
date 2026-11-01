import compression from "compression";
import cookieParser from "cookie-parser";
import express from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { loadUser } from "./middleware/auth";
import { clientIp } from "./middleware/client-ip";
import { csrfGuard, noStore } from "./middleware/security";
import { accountRoutes } from "./routes/account";
import { adminRoutes } from "./routes/admin";
import { authRoutes } from "./routes/auth";
import { learningRoutes } from "./routes/learning";
import { emailRoutes, notificationRoutes, pushRoutes } from "./routes/notifications";
import type { AppRuntime } from "./runtime";

export interface AppOptions {
  webOrigin: string;
  /** Secure cookies require HTTPS; on in production. */
  secureCookies: boolean;
  /** Shared with the Next.js proxy so it can vouch for the client IP it forwards. */
  proxySecret?: string;
}

export const createApp = (runtime: AppRuntime, opts: AppOptions) => {
  const app = express();
  app.disable("x-powered-by");
  // The API sits behind the Next.js proxy (and a load balancer in production).
  app.set("trust proxy", process.env.TRUST_PROXY ?? "loopback, linklocal, uniquelocal");

  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } }, crossOriginResourcePolicy: { policy: "same-origin" } }));
  app.use(compression());
  app.use(express.json({ limit: "20kb" }));
  app.use(cookieParser());
  app.use(clientIp(opts.proxySecret));
  app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: "draft-8", legacyHeaders: false, keyGenerator: (req) => ipKeyGenerator(req.clientIp) }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/email", noStore, express.urlencoded({ extended: false, limit: "2kb" }), emailRoutes(runtime));
  app.use("/api", noStore, csrfGuard(opts.webOrigin), loadUser(runtime, opts.secureCookies));
  app.use("/api/auth", authRoutes(runtime, { secure: opts.secureCookies, webOrigin: opts.webOrigin }));
  app.use("/api/me/notifications", notificationRoutes(runtime));
  app.use("/api/me/push", pushRoutes(runtime));
  app.use("/api/admin", adminRoutes(runtime));
  app.use("/api/me", accountRoutes(runtime, { secure: opts.secureCookies }));
  app.use("/api", learningRoutes(runtime));

  app.use((_req, res) => res.status(404).json({ error: { code: "NotFound", message: "Not found." } }));
  app.use(((err, _req, res, _next) => {
    if ((err as { type?: string }).type === "entity.parse.failed") return res.status(400).json({ error: { code: "BadJson", message: "Malformed JSON." } });
    if ((err as { type?: string }).type === "entity.too.large") return res.status(413).json({ error: { code: "TooLarge", message: "Request too large." } });
    console.error("[express]", err);
    res.status(500).json({ error: { code: "Internal", message: "Unexpected error." } });
  }) as express.ErrorRequestHandler);

  return app;
};
