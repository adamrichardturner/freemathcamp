import { timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import type { RequestHandler } from "express";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The learner's IP, for rate limiting and session records. */
      clientIp: string;
    }
  }
}

const matches = (given: string | undefined, secret: Buffer) => {
  if (!given) return false;
  const g = Buffer.from(given);
  return g.length === secret.length && timingSafeEqual(g, secret);
};

/**
 * In production the browser talks to the Next.js app, which proxies /api to
 * us, so the connecting IP belongs to the hosting platform. The proxy signs
 * each request with a shared secret and passes the real client IP; we only
 * believe that header when the signature matches, so a direct caller can't
 * spoof it to dodge rate limits. Otherwise we fall back to Express's req.ip.
 */
export const clientIp =
  (proxySecret: string | undefined): RequestHandler =>
  (req, _res, next) => {
    const forwarded = req.get("x-fmc-client-ip")?.trim();
    req.clientIp =
      proxySecret && forwarded && isIP(forwarded) && matches(req.get("x-fmc-proxy-secret"), Buffer.from(proxySecret))
        ? forwarded
        : (req.ip ?? "unknown");
    next();
  };
