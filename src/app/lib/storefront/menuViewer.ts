import { cookies } from "next/headers";
import { CounterSessionService, TableDraftService } from "@/app/services";
import {
  COUNTER_SESSION_COOKIE,
  CONTRIBUTOR_TOKEN_COOKIE,
} from "./orderSessionCookie";
import { parseContributorTokenMap } from "./contributorToken";
import { viewerKeyFor } from "@/app/lib/menu/menuViews";

/**
 * The hashed viewer key (lib/menu/menuViews) of THIS browser at a
 * location, or null when it has no QR session there (an online visitor —
 * not counted). Server only: reads the cookies, through the existing
 * checks only —
 *  - Table: a current contributor token for a live table at this
 *    location (TableDraftService.findCurrentTokenTableAtLocation, the
 *    epoch rule) → "table:<token>";
 *  - Counter: the cookie's open bill here
 *    (CounterSessionService.findOpenCounterBill, read-only "peek") → its
 *    root round, "bill:<billSessionId ?? id>".
 * Only the hash leaves this function; the raw token is never returned,
 * stored or logged. Writes nothing.
 */
export async function menuViewerKeyAt(locationId: number): Promise<string | null> {
  const store = await cookies();
  const tableTokens = parseContributorTokenMap(
    store.get(CONTRIBUTOR_TOKEN_COOKIE)?.value,
  );
  const tableId = await TableDraftService.findCurrentTokenTableAtLocation(
    locationId,
    tableTokens,
  );
  const tableToken = tableId !== null ? tableTokens[String(tableId)] : undefined;
  if (tableToken) {
    return viewerKeyFor({ kind: "table", contributorToken: tableToken });
  }

  const bill = await CounterSessionService.findOpenCounterBill(
    store.get(COUNTER_SESSION_COOKIE)?.value ?? null,
    locationId,
    "peek",
  );
  return bill
    ? viewerKeyFor({ kind: "bill", billRootId: bill.billSessionId ?? bill.id })
    : null;
}
