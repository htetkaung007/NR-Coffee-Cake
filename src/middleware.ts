import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";

/**
 * Two unrelated concerns share one middleware.ts because Next.js only
 * allows a single middleware file per app — the matcher below covers
 * both path groups, and this function branches by pathname before
 * doing anything else.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/counter/menu")) {
    return guardCounterMenu(request);
  }

  return guardBackoffice(request);
}

/**
 * Design doc "Step 2: Middleware Protection". Fast, cookie-presence-
 * only check — deliberately does NOT query the database here (that's
 * what makes this middleware-appropriate instead of a page-level
 * check): a session whose cookie has been cleared (PAID, or never
 * existed) is redirected before ever reaching the page. A cookie that
 * IS present but points at a terminal session still needs a real DB
 * check — that happens in the /counter/menu page itself
 * (OrderSessionService.getActiveSessionByToken), since "terminal" can
 * only be known from the database, not from the cookie's mere
 * presence.
 */
function guardCounterMenu(request: NextRequest) {
  const token = request.cookies.get(COUNTER_SESSION_COOKIE)?.value;

  if (!token) {
    const menuUrl = new URL("/menu", request.url);
    const locationId = request.nextUrl.searchParams.get("locationId");
    if (locationId) menuUrl.searchParams.set("locationId", locationId);
    return NextResponse.redirect(menuUrl);
  }

  return NextResponse.next();
}

async function guardBackoffice(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    const signInUrl = new URL("/auth/signIn", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/backoffice/:path*", "/counter/menu/:path*"],
};
