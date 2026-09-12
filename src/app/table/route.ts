import { NextRequest, NextResponse } from "next/server";
import { OrderSessionService } from "@/app/services";
import { CONTRIBUTOR_TOKEN_COOKIE } from "@/app/lib/orderSessionCookie";
import {
  MAX_TABLES_REMEMBERED,
  parseContributorTokenMap,
  mintContributorToken,
  getTokenEpoch,
} from "@/app/lib/contributorToken";

/**
 * Table QR entry point (e.g. /table?locationId=1&tableId=5&key=xxx) —
 * checked the same way Counter's key is (see customer/route.ts), so
 * this always redirects to the clean, key-free /menu URL and never
 * renders a page itself.
 *
 * Per the per-customer draft redesign: this no longer creates or
 * resolves an OrderSession at all (see
 * OrderSessionService.resolveTableQrScan's own comment) — it only
 * confirms the key is real/current, then mints (or reuses) this
 * browser's own CONTRIBUTOR_TOKEN_COOKIE entry for this table. tableId
 * itself now travels in the /menu URL (not a session cookie), since
 * there's no session yet at this point for a cookie to describe.
 *
 * Reads/writes CONTRIBUTOR_TOKEN_COOKIE via request.cookies/
 * response.cookies (not contributorToken.ts's next/headers-based
 * helpers) to match this codebase's own established convention for
 * Route Handlers — see customer/route.ts, which does the same for
 * COUNTER_SESSION_COOKIE.
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

  menuUrl.searchParams.set("tableId", String(result.table.id));

  const existingMap = parseContributorTokenMap(
    request.cookies.get(CONTRIBUTOR_TOKEN_COOKIE)?.value,
  );
  const tableKey = String(result.table.id);
  const existingToken = existingMap[tableKey];
  // Reuse the existing token only if it was minted under the table's
  // CURRENT epoch — a stale one (table settled since, epoch bumped by
  // markSessionsPaid) means this browser's old draft membership no
  // longer applies, and it needs a fresh token the same as if it had
  // never scanned this table before. See Table.contributorEpoch's own
  // comment for the full reasoning.
  const isExistingTokenCurrent =
    existingToken !== undefined &&
    getTokenEpoch(existingToken) === result.table.contributorEpoch;

  const nextMap = isExistingTokenCurrent
    ? existingMap
    : {
        ...Object.fromEntries(
          Object.entries(existingMap).slice(-(MAX_TABLES_REMEMBERED - 1)),
        ),
        [tableKey]: mintContributorToken(result.table.contributorEpoch),
      };

  const response = NextResponse.redirect(menuUrl);
  response.cookies.set(CONTRIBUTOR_TOKEN_COOKIE, JSON.stringify(nextMap), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}
