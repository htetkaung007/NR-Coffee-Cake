"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  OrderSessionService,
  MenuService,
  OrderSessionCartService,
} from "@/app/services";
import { AppError } from "@/app/lib/errors";
import { toActionResult, toSafeResult } from "@/app/lib/actionHelper";
import {
  COUNTER_SESSION_COOKIE,
  TABLE_SESSION_COOKIE,
} from "@/app/lib/orderSessionCookie";
import { isSessionTerminal } from "../services/orderService/orderSession.service";
import { config } from "../utils/config";

/** The one place this file reads the cookie jar — every action below
 *  goes through this instead of repeating `cookies()` + `.get(...)`
 *  itself. Checks BOTH cookies (a phone could only ever realistically
 *  hold one at a time in normal use, but nothing stops a Counter scan
 *  and a Table scan happening in the same browser) and returns which
 *  cookie NAME matched, so callers that need to clear it clear the
 *  right one — Counter and Table are separate cookies (see
 *  TABLE_SESSION_COOKIE's comment), not interchangeable. Returns the
 *  cookie store too (not just the token) since a couple of callers
 *  also need to clear the cookie in the same request. */
async function getCookieToken() {
  const store = await cookies();
  const counterToken = store.get(COUNTER_SESSION_COOKIE)?.value;
  if (counterToken) {
    return { store, token: counterToken, cookieName: COUNTER_SESSION_COOKIE };
  }
  const tableToken = store.get(TABLE_SESSION_COOKIE)?.value;
  if (tableToken) {
    return { store, token: tableToken, cookieName: TABLE_SESSION_COOKIE };
  }
  return { store, token: null, cookieName: null };
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

const safeAddToCart = toSafeResult(
  async (input: { menuId: number; quantity: number; addonIds: number[] }) => {
    const session = await requireSessionFromCookie();
    return OrderSessionCartService.addItemToCart(
      session.id,
      session.tableId as number,
      input.menuId,
      input.quantity,
      input.addonIds,
    );
  },
);

export async function addToCartAction(
  menuId: number,
  quantity: number,
  addonIds: number[] = [],
) {
  const result = await safeAddToCart({ menuId, quantity, addonIds });
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
  }
  return actionResult;
}

const safeRemoveFromCart = toSafeResult(async (orderId: number) => {
  const session = await requireSessionFromCookie();
  return OrderSessionCartService.removeItemFromCart(session.id, orderId);
});

export async function removeFromCartAction(orderId: number) {
  const result = await safeRemoveFromCart(orderId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath(`${url}/menu`);
  }
  return actionResult;
}

/** No session required — view-only browsing (hasSession=false) can
 *  open a menu's detail the same as an active order can, so this
 *  doesn't go through requireSessionFromCookie. locationId is passed
 *  explicitly (not read from a session) for that same reason: there
 *  may be no session to read it from. Returns null (not a thrown
 *  error) for a menu that doesn't exist or belongs to a different
 *  location's stock — the modal treats that as "nothing to show"
 *  rather than an error state. */
export async function getMenuDetailAction(menuId: number, locationId: number) {
  return MenuService.getMenuDetailForCustomer(menuId, locationId);
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
 * component. Deliberately does the PAID-clears-cookie write here (see
 * OrderSessionApprovalService.markSessionPaid's comment) — this IS the
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
 *
 * Also returns cart line items (not just status) — needed for Table
 * QR's shared-cart case: when one phone in the group adds an item,
 * every other phone polling the SAME session (same token — see
 * TABLE_SESSION_COOKIE) needs to pick up that change on its next
 * poll tick, not just a status change. Harmless/unused extra data for
 * Counter QR, where only one phone is ever really watching.
 */
export async function pollOrderStatusAction() {
  const { store, token, cookieName } = await getCookieToken();
  if (!token || !cookieName) {
    return { status: "no_session" as const, cart: [] };
  }

  const session = await OrderSessionService.getSessionByToken(token);
  if (!session) {
    store.set(cookieName, "", { maxAge: 0 });
    return { status: "no_session" as const, cart: [] };
  }

  const refreshed = await OrderSessionService.getSessionStatus(session.id);

  if (isSessionTerminal(refreshed.status)) {
    store.set(cookieName, "", { maxAge: 0 });
  }

  // session.orders (from getSessionByToken, above) reflects the cart
  // as of the START of this call — good enough at a 4s poll interval,
  // and avoids a second DB round-trip just to re-read what's almost
  // certainly still current.
  return {
    status: refreshed.status,
    cart: session.orders.map((order: (typeof session.orders)[0]) => ({
      id: order.id,
      menuName: order.menu.name,
      quantity: order.quantity,
      price: order.menu.price,
    })),
  };
}
