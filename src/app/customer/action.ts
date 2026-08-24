"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { OrderSessionService } from "@/app/services";
import { isSessionTerminal } from "@/app/services/orderSession.service";
import { AppError } from "@/app/lib/errors";
import { toActionResult, toSafeResult } from "@/app/lib/actionHelper";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";

/** The one place this file reads the cookie jar — every action below
 *  goes through this instead of repeating `cookies()` +
 *  `.get(COUNTER_SESSION_COOKIE)` itself. Returns the cookie store too
 *  (not just the token) since a couple of callers also need to clear
 *  the cookie in the same request. */
async function getCookieToken() {
  const store = await cookies();
  return { store, token: store.get(COUNTER_SESSION_COOKIE)?.value ?? null };
}

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
  async (input: { menuId: number; quantity: number }) => {
    const session = await requireSessionFromCookie();
    return OrderSessionService.addItemToCart(
      session.id,
      session.tableId as number,
      input.menuId,
      input.quantity,
    );
  },
);

export async function addToCartAction(menuId: number, quantity: number) {
  const result = await safeAddToCart({ menuId, quantity });
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/menu");
  }
  return actionResult;
}

const safeSubmitOrder = toSafeResult(async () => {
  const session = await requireSessionFromCookie();
  return OrderSessionService.submitOrderForApproval(session.id);
});

export async function submitOrderAction() {
  const result = await safeSubmitOrder();
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/menu");
  }
  return actionResult;
}

/**
 * Design doc "Step 3: Polling". Called every few seconds from a client
 * component. Deliberately does the PAID-clears-cookie write here (see
 * OrderSessionService.markSessionPaid's comment) — this IS the
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
  const { store, token } = await getCookieToken();
  if (!token) {
    return { status: "no_session" as const };
  }

  const session = await OrderSessionService.getSessionByToken(token);
  if (!session) {
    store.set(COUNTER_SESSION_COOKIE, "", { maxAge: 0 });
    return { status: "no_session" as const };
  }

  const refreshed = await OrderSessionService.getSessionStatus(session.id);

  if (isSessionTerminal(refreshed.status)) {
    store.set(COUNTER_SESSION_COOKIE, "", { maxAge: 0 });
  }

  return { status: refreshed.status };
}
