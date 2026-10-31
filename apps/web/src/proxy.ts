import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth check: pages that only make sense signed in redirect early
 * when there's no session cookie. The API still authorises every request.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("fmc_session") || request.cookies.has("__Host-fmc_session");
  if (hasSession) return NextResponse.next();
  const url = new URL("/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/learn/:path*", "/progress/:path*"],
};
