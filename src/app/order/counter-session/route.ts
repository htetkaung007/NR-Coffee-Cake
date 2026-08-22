import { NextRequest, NextResponse } from "next/server";
import { OrderSessionService } from "@/app/services";

/**
 * GET /order/counter-session?locationId=X&tableId=Y&key=Z
 *
 * Route Handlers are the one place (besides Server Actions triggered
 * from the client) where Next.js allows writing cookies. A Server
 * Component's render — even one that calls a "use server" function
 * directly via await, rather than the client triggering it — does
 * NOT count, which is why an earlier attempt using a directly-awaited
 * Server Action still threw "Cookies can only be modified in a Server
 * Action or Route Handler." This route exists specifically to be the
 * legal place to do the write.
 *
 * order/page.tsx redirects here only on a first scan (key present in
 * the URL) — see its doc comment. This handler verifies the key
 * against the table's stored counterAccessKey via
 * OrderSessionService.startCounterSessionFromKey, and either:
 *  - key is valid: creates a PENDING_APPROVAL session, sets the
 *    cookie, redirects to the same order URL with &key= stripped.
 *  - key is invalid/missing/reused after the table's key rotated:
 *    redirects to the same URL with &key= stripped and no cookie set
 *    — order/page.tsx then finds no cookie and no key, so it falls
 *    through to view-only. Deliberately the same redirect shape
 *    either way (no error page, no "invalid key" message) so this
 *    can't be used to probe which keys are valid.
 */
export async function GET(request: NextRequest) {
  const locationId = request.nextUrl.searchParams.get("locationId");
  const tableId = request.nextUrl.searchParams.get("tableId");
  const key = request.nextUrl.searchParams.get("key");

  if (!locationId || !tableId) {
    return NextResponse.redirect(new URL("/order", request.url));
  }

  const redirectUrl = new URL("/order", request.url);
  redirectUrl.searchParams.set("locationId", locationId);
  redirectUrl.searchParams.set("tableId", tableId);
  // Deliberately no &key= on the redirect target — this is what
  // "strips the key from the URL" in practice, since the browser's
  // address bar ends up here, not on the original scanned link.

  if (!key) {
    return NextResponse.redirect(redirectUrl);
  }

  const session = await OrderSessionService.startCounterSessionFromKey(
    Number(tableId),
    key,
  ).catch(() => null); // invalid key → ValidationError → treat as "no session," not a crash

  if (!session) {
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set("counterOrderSessionId", String(session.id), {
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24h cookie lifetime — the session's own 12h staleness rule (OrderSessionService) is what actually governs reuse, this is just an outer bound
    sameSite: "lax",
    path: "/",
  });

  return response;
}
