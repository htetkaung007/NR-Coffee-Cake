"use server";

import { cookies } from "next/headers";
import { OrderSessionService, isSessionTerminal } from "@/app/services";
import {
  COUNTER_SESSION_COOKIE,
  counterSessionCookieOptions,
} from "@/app/lib/orderSessionCookie";
import { toCartLine } from "@/app/lib/roundLine";
import { orderLinesTotal } from "@/app/lib/orderTotals";
import { approvalTiming } from "@/app/lib/approvalTiming";

/** The one place this file reads the Counter session cookie. The cart
 *  itself lives in the browser now (sent with submitCartAction, in
 *  cart/action.ts); what's left here is the order-status poll.
 *  Counter-only: Table QR has no session cookie anymore (see
 *  orderSessionCookie.ts's comment on the removed TABLE_SESSION_COOKIE)
 *  — its own actions in table/action.ts use getContributorToken + an
 *  explicit tableId instead. Returns the cookie store too (not just the token) since the
 *  poll may clear or move the cookie in the same request. */
async function getCookieToken() {
  const store = await cookies();
  const token = store.get(COUNTER_SESSION_COOKIE)?.value ?? null;
  return { store, token, cookieName: token ? COUNTER_SESSION_COOKIE : null };
}

/**
 * Design doc "Step 3: Polling". Called every few seconds from a client
 * component — Counter QR only now (Table QR's own round-status
 * polling is pollTableAction in table/action.ts, which is tableId-
 * keyed rather than cookie-keyed for the same reason drafts are — see
 * TableDraftService's class comment). Deliberately does the
 * PAID-clears-cookie write here (see
 * OrderSessionApprovalService.markSessionsPaid's comment) — this IS the
 * customer's own browser making the request, so a Server Action here
 * can set the response cookie, unlike the cashier's Approve/Reject/Paid
 * actions in the Backoffice, which run in a different browser entirely.
 *
 * A missing/absent session is a normal, expected result here
 * ("no_session"), not an error. The terminal-status check reuses the
 * Service's isSessionTerminal so it can't drift from
 * getActiveSessionByToken's definition.
 */
export async function pollOrderStatusAction() {
  const { store, token, cookieName } = await getCookieToken();
  if (!token || !cookieName) {
    return { status: "no_session" as const, cart: [], total: 0 };
  }

  const session = await OrderSessionService.getSessionByToken(token);
  if (!session) {
    store.set(cookieName, "", { maxAge: 0 });
    return { status: "no_session" as const, cart: [], total: 0 };
  }

  const refreshed = await OrderSessionService.getSessionStatus(session.id);

  if (isSessionTerminal(refreshed.status)) {
    // This round is done (rejected, timed out, or paid), but it might
    // belong to a bill that split into multiple rounds ("Order More")
    // and still has another one open (e.g. round 1 still PENDING/
    // COOKING while this was round 2, just Rejected) — move the
    // cookie onto that root round instead of clearing it, so the
    // customer isn't locked out of a bill that isn't actually settled
    // yet. The status/cart/total returned below still describe THIS
    // round, so the existing terminal handling for it is unchanged.
    const root = await OrderSessionService.getOpenBillRoot(session);
    if (root) {
      store.set(cookieName, root.token, counterSessionCookieOptions);
    } else {
      store.set(cookieName, "", { maxAge: 0 });
    }
  }

  // session.orders (from getSessionByToken, above) reflects the cart
  // as of the START of this call — good enough at a 4s poll interval,
  // and avoids a second DB round-trip just to re-read what's almost
  // certainly still current.
  return {
    status: refreshed.status,
    // With the round's own number, so a CANCELLED result can say which
    // order wasn't accepted (see shownCancelReason).
    cancelReason: refreshed.cancelReason,
    orderNumber: refreshed.orderNumber,
    // Time left to confirm, measured on the SERVER's clock (null unless
    // the round is still waiting with a deadline).
    approval: approvalTiming(refreshed, new Date()),
    total: orderLinesTotal(session.orders),
    cart: session.orders.map(toCartLine),
  };
}
