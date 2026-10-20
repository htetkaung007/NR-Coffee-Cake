import { NextRequest } from "next/server";
import { CounterSessionService, TableDraftService } from "@/app/services";
import {
  COUNTER_SESSION_COOKIE,
  CONTRIBUTOR_TOKEN_COOKIE,
  counterSessionCookieOptions,
} from "@/app/lib/storefront/orderSessionCookie";
import { parseContributorTokenMap } from "@/app/lib/storefront/contributorToken";
import {
  openOrderPlace,
  openPlaceMenuQuery,
} from "@/app/lib/storefront/openOrderPlace";
import { isSecureRequest } from "@/app/lib/http/secureCookie";
import { redirectTo, relativePath } from "@/app/lib/http/redirect";
import { readQrScanParams } from "@/app/lib/storefront/qrScanParams";

/**
 * Design doc "Step 1: QR Scan & URL Validation". A GET here is the
 * ONLY thing the printed Counter QR points to (e.g.
 * /counter?locationId=1&tableId=5&key=awzy). It never renders
 * a page itself — it validates the key, sets a cookie, and redirects
 * to the clean customer-facing URL. This keeps the key out of
 * anything a customer could bookmark, screenshot, or leave in browser
 * history: the address bar only ever shows the post-redirect URL.
 */
export async function GET(request: NextRequest) {
  const { locationId, tableId, key } = readQrScanParams(
    request.nextUrl.searchParams,
  );

  // Relative redirects only (lib/http/redirect): the phone keeps the
  // address it scanned (the LAN IP), never the server's own host.
  if (!locationId || !tableId || !key) {
    return redirectTo("/menu");
  }

  const menuPath = relativePath("/menu", { locationId });

  const counterTable = await CounterSessionService.findCounterTableByKey(
    tableId,
    key,
  );
  if (!counterTable) {
    // Wrong or rotated key — fail closed without revealing why. The
    // given locationId still came from the QR content itself, not a DB
    // lookup, so it's safe to reuse for the view-only redirect.
    return redirectTo(menuPath);
  }

  // One unpaid bill per phone at a location: a browser still at a table
  // here goes back to that table instead of starting a Counter bill
  // (lib/storefront/openOrderPlace — decided before any session starts).
  const decision = openOrderPlace({
    scan: "counter",
    openTableIdHere: await TableDraftService.findCurrentTokenTableAtLocation(
      counterTable.locationId,
      parseContributorTokenMap(request.cookies.get(CONTRIBUTOR_TOKEN_COOKIE)?.value),
    ),
    hasOpenCounterBillHere: false,
  });
  if (decision.kind !== "proceed") {
    return redirectTo(
      relativePath("/menu", openPlaceMenuQuery(decision, counterTable.locationId)),
    );
  }

  const existingToken =
    request.cookies.get(COUNTER_SESSION_COOKIE)?.value ?? null;
  const result = await CounterSessionService.resolveCounterSession(
    counterTable.locationId,
    counterTable.id,
    existingToken,
  );

  if (result.status === "locked") {
    // Cookie's session is terminal (PAID/etc.) — see design doc
    // section 4/6. Clear the now-useless cookie and send them to
    // read-only browsing; there is deliberately no "order again" path
    // from here (see CounterSessionService.resolveCounterSession).
    const response = redirectTo(menuPath);
    response.cookies.set(COUNTER_SESSION_COOKIE, "", { maxAge: 0 });
    return response;
  }

  // status === "active" — reused or freshly-started session. Set/renew
  // the cookie and land on /counter/continue, which opens the cart if
  // this browser already has one for the location (built while
  // browsing Online) and the menu otherwise.
  const response = redirectTo(
    relativePath("/counter/continue", { locationId: result.session.locationId }),
  );
  response.cookies.set(
    COUNTER_SESSION_COOKIE,
    result.session.token,
    counterSessionCookieOptions(isSecureRequest(request)),
  );
  return response;
}
