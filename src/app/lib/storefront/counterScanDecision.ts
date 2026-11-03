import {
  isAbandonedCart,
  isPastApprovalWindow,
  isSessionTerminal,
} from "@/app/lib/order/sessionStatus";

/** The cookie's session, as the Counter scan reads it. */
export interface ScannedSession {
  status: string;
  createdAt: Date;
  approvalExpiresAt: Date | null;
}

/**
 * What a Counter QR scan with a VALID key does with the browser's
 * Counter cookie (CounterSessionService.resolveCounterSession):
 *  - "reuse" — the cookie's session is still open (a cart within its
 *    time, a round waiting for approval, an accepted unpaid bill): an
 *    open bill is never replaced;
 *  - "reuseBillRoot" — only this "Order More" round ended (rejected,
 *    expired, withdrawn) but the bill's first round is still open:
 *    back onto the bill;
 *  - "cancelAbandonedThenStart" — an unsent cart past
 *    CART_ABANDON_MINUTES: cancel it (UNSUBMITTED), then a new session;
 *  - "start" — no cookie / no such session, or a FINISHED bill (paid,
 *    rejected, expired, withdrawn): a new session at once, exactly like
 *    a first scan.
 * Why a finished bill may start again: the scan carries the valid
 * rotating key — the same proof of presence as a first scan. A finished
 * cookie still can't order WITHOUT a scan (cart submit, Order More and
 * the poll refuse it). The one-open-bill-per-phone rule
 * (openOrderPlace) runs before this. Pure.
 */
export function decideCounterScan(
  current: ScannedSession | null,
  facts: { hasOpenBillRoot: boolean },
  now: Date = new Date(),
): "start" | "reuse" | "reuseBillRoot" | "cancelAbandonedThenStart" {
  if (current === null) return "start";
  if (isAbandonedCart(current, now)) return "cancelAbandonedThenStart";
  const ended =
    isSessionTerminal(current.status) || isPastApprovalWindow(current, now);
  if (!ended) return "reuse";
  return facts.hasOpenBillRoot ? "reuseBillRoot" : "start";
}
