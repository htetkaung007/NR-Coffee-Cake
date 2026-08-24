import { NextRequest, NextResponse } from "next/server";
import { OrderSessionService } from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";

/**
 * Design doc "Step 1: QR Scan & URL Validation". A GET here is the
 * ONLY thing the printed Counter QR points to (e.g.
 * /customer?locationId=1&tableId=5&key=awzy). It never renders
 * a page itself — it validates the key, sets a cookie, and redirects
 * to the clean customer-facing URL. This keeps the key out of
 * anything a customer could bookmark, screenshot, or leave in browser
 * history: the address bar only ever shows the post-redirect URL.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationId = Number(searchParams.get("locationId"));
  const tableId = Number(searchParams.get("tableId"));
  const key = searchParams.get("key");

  if (!locationId || !tableId || !key) {
    return NextResponse.redirect(new URL("/menu", request.url));
  }

  const existingToken =
    request.cookies.get(COUNTER_SESSION_COOKIE)?.value ?? null;

  const result = await OrderSessionService.resolveCounterQrScan(
    tableId,
    key,
    existingToken,
  );

  const menuUrl = new URL("/menu", request.url);
  menuUrl.searchParams.set("locationId", String(locationId));

  if (result.status === "invalid_key") {
    // Wrong or rotated key — fail closed without revealing why (see
    // OrderSessionService.resolveCounterQrScan). The given locationId
    // still came from the QR content itself, not a DB lookup, so it's
    // safe to reuse for the view-only redirect.
    return NextResponse.redirect(menuUrl);
  }

  if (result.status === "locked") {
    // Cookie's session is terminal (PAID/etc.) — see design doc
    // section 4/6. Clear the now-useless cookie and send them to
    // read-only browsing; there is deliberately no "order again" path
    // from here (see OrderSessionService.resolveCounterSession).
    const response = NextResponse.redirect(menuUrl);
    response.cookies.set(COUNTER_SESSION_COOKIE, "", { maxAge: 0 });
    return response;
  }

  // status === "active" — reused or freshly-started session. Set/renew
  // the cookie and land on /menu, which now shows the order UI itself
  // once it sees a valid session cookie (see menu/page.tsx).
  const response = NextResponse.redirect(menuUrl);
  response.cookies.set(COUNTER_SESSION_COOKIE, result.session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}
