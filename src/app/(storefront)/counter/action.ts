"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { OrderSessionService, isSessionTerminal } from "@/app/services";
import { AppError } from "@/app/lib/errors";
import { toActionResult, toSafeResult } from "@/app/lib/actionHelper";
import {
  COUNTER_SESSION_COOKIE,
  counterSessionCookieOptions,
} from "@/app/lib/orderSessionCookie";
import { toCartLine } from "@/app/lib/roundLine";
import { orderLinesTotal } from "@/app/lib/orderTotals";
import { config } from "@/app/utils/config";

/** The one place this file reads the Counter session cookie — every
 *  Counter-flow action below goes through this instead of repeating
 *  `cookies()` + `.get(...)` itself. Counter-only now: Table QR has
 *  no session cookie anymore (see orderSessionCookie.ts's comment on
 *  the removed TABLE_SESSION_COOKIE) — its own actions in
 *  table/action.ts use getContributorToken + an explicit tableId
 *  instead. Returns the cookie store too (not just the token) since a
 *  couple of callers also need to clear the cookie in the same
 *  request. */
async function getCookieToken() {
  const store = await cookies();
  const token = store.get(COUNTER_SESSION_COOKIE)?.value ?? null;
  return { store, token, cookieName: token ? COUNTER_SESSION_COOKIE : null };
}
const url = config.orderAppUrl;

/** Every cart/order action resolves the session from the cookie
 *  itself, never from a client-supplied id — a customer's request can
 *  only ever act on the session their own browser is holding. Uses
 *  getActiveSessionByToken (not the raw getSessionByToken) so an
 *  abandoned-past-40-minutes or already-terminal session is rejected
 *  here too, not just on the page's initial load. Throws (via
 *  toSafeResult) rather than returning null, since these callers have
 *  no reasonable fallback besides surfacing an error. */
async function requireSessionFromCookie() {
  const { token } = await getCookieToken();
  if (!token) {
    throw new AppError("No active order session.", "UNAUTHORIZED");
  }

  const session = await OrderSessionService.getActiveSessionByToken(token);
  if (!session) {
    throw new AppError("Order session not found or has expired.", "NOT_FOUND");
  }
  if (!session.tableId) {
    throw new AppError("Order session has no table.", "VALIDATION");
  }

  return session;
}

const safeSubmitOrder = toSafeResult(async () => {
  const session = await requireSessionFromCookie();
  return OrderSessionService.submitOrderForApproval(session.id);
});

export async function submitOrderAction() {
  const result = await safeSubmitOrder();
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
  }
  return actionResult;
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
 * Doesn't reuse requireSessionFromCookie — that one throws on a
 * missing/absent session, which is the right behavior for cart
 * actions but wrong here: polling needs to report "no_session" as a
 * normal, expected result, not an error. Only the cookie-read
 * (getCookieToken) is shared between them; the terminal-status check
 * reuses the Service's isSessionTerminal so it can't drift from
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
    total: orderLinesTotal(session.orders),
    cart: session.orders.map(toCartLine),
  };
}
