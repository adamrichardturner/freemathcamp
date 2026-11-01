import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:4100";
const PROXY_SECRET = process.env.PROXY_SECRET;
const PROTECTED = ["/learn", "/progress", "/settings", "/notifications", "/admin"];

/**
 * Two jobs:
 * 1. Forward /api/* to the API so the browser only ever talks to this origin
 *    (first-party, SameSite-protected cookies). The request is signed with a
 *    shared secret and carries the visitor's IP, which the API trusts only
 *    when the signature matches — otherwise every learner would share the
 *    hosting platform's IP for rate limiting.
 * 2. Optimistically redirect signed-out visitors away from signed-in pages.
 *    The API still authorises every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    const headers = new Headers(request.headers);
    headers.delete("x-fmc-client-ip");
    headers.delete("x-fmc-proxy-secret");
    if (PROXY_SECRET) {
      const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
      if (ip) headers.set("x-fmc-client-ip", ip);
      headers.set("x-fmc-proxy-secret", PROXY_SECRET);
    }
    return NextResponse.rewrite(new URL(`${pathname}${search}`, API_URL), { request: { headers } });
  }

  const hasSession = request.cookies.has("fmc_session") || request.cookies.has("__Host-fmc_session");
  if (hasSession || !PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();
  const url = new URL("/login", request.url);
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/api/:path*", "/learn/:path*", "/progress/:path*", "/settings/:path*", "/notifications/:path*", "/admin/:path*"],
};
