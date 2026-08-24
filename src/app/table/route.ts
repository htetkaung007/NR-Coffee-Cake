import { NextRequest, NextResponse } from "next/server";
import { OrderSessionService } from "@/app/services";
import { TABLE_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";

/**
 * Table QR entry point (e.g. /table?locationId=1&tableId=5&key=xxx) —
 * checked the same way Counter's key is (see customer/route.ts), so
 * this always redirects to the clean, key-free /menu URL and never
 * renders a page itself. The one intentional difference from Counter
 * is what happens AFTER the key passes: every phone that scans THIS
 * table's QR gets the SAME session token written back (see
 * TABLE_SESSION_COOKIE's comment and resolveTableSession) — that's
 * what makes the cart shared across a group's phones, unlike Counter
 * QR where each phone's cookie is its own individual session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locationId = Number(searchParams.get("locationId"));
  const tableId = Number(searchParams.get("tableId"));
  const key = searchParams.get("key");

  const menuUrl = new URL("/menu", request.url);
  if (locationId) menuUrl.searchParams.set("locationId", String(locationId));

  if (!locationId || !tableId || !key) {
    return NextResponse.redirect(menuUrl);
  }

  const result = await OrderSessionService.resolveTableQrScan(tableId, key);

  if (result.status === "invalid_key") {
    // Wrong or rotated key — fail closed without revealing why, same
    // as Counter (see resolveCounterQrScan's comment).
    return NextResponse.redirect(menuUrl);
  }

  const response = NextResponse.redirect(menuUrl);
  response.cookies.set(TABLE_SESSION_COOKIE, result.session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return response;
}
