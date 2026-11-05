import type { RequestHandler } from "express";
import { isNativeClient } from "./auth";

const SAFE = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence in depth (alongside SameSite=Lax cookies): state-changing
 * requests must come from our web origin and carry JSON, which a cross-site
 * HTML form cannot send. The iOS app has no origin; its custom client header
 * stands in, since browsers can't send it cross-site without a preflight.
 */
export const csrfGuard =
  (webOrigin: string): RequestHandler =>
  (req, res, next) => {
    if (SAFE.has(req.method)) return next();
    const origin = req.get("origin") ?? (req.get("referer") ? new URL(req.get("referer")!).origin : null);
    if (origin !== webOrigin && !(origin === null && isNativeClient(req))) return res.status(403).json({ error: { code: "Forbidden", message: "Cross-origin request blocked." } });
    if (req.body !== undefined && req.get("content-length") !== "0" && !req.is("application/json"))
      return res.status(415).json({ error: { code: "UnsupportedMediaType", message: "Send JSON." } });
    next();
  };

/** API responses are user-specific: never cache them in shared caches. */
export const noStore: RequestHandler = (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
};
