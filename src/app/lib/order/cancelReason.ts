import type { CancelReason } from "../../../../prisma/generated/enums";

export type { CancelReason };

/**
 * Why a sent round ended CANCELLED, and who reads it how. Pure.
 *
 * - REJECTED / EXPIRED — the shop's miss: the counter turned it down or
 *   didn't decide in time. These are the Reports' "Cancelled" figures
 *   (count, change on the previous period, Not charged, the cancelled
 *   CSV).
 * - WITHDRAWN — the customer cancelled their own round while it waited
 *   for approval. Not the shop's miss: listed in History with the
 *   others, counted apart on Reports.
 * - UNSUBMITTED — a cart that was never sent; never listed anywhere.
 */

/** Sent rounds that were cancelled — what History's Cancelled tab, its
 *  detail view and header count, in this order. */
export const SENT_CANCEL_REASONS = [
  "REJECTED",
  "EXPIRED",
  "WITHDRAWN",
] as const satisfies readonly CancelReason[];

/** The shop's misses — what the Reports' Cancelled figures count. */
export const SHOP_MISSED_CANCEL_REASONS = [
  "REJECTED",
  "EXPIRED",
] as const satisfies readonly CancelReason[];

/** WITHDRAWN as staff read it (History, Reports, the new-order alert). */
const WITHDRAWN_STAFF_LABEL = "Cancelled by customer";

/** WITHDRAWN as the customer reads it (/history, receipts). */
const WITHDRAWN_CUSTOMER_LABEL = "Cancelled by you";

/** A sent round's cancel reason in words, for staff or for the customer.
 *  Null for a reason that's never shown (a cart never sent, none). */
export function cancelReasonLabel(
  reason: string | null | undefined,
  audience: "staff" | "customer",
): string | null {
  switch (reason) {
    case "REJECTED":
      return audience === "staff" ? "Rejected" : "Not accepted";
    case "EXPIRED":
      return audience === "staff" ? "Timed out" : "Not confirmed in time";
    case "WITHDRAWN":
      return audience === "staff"
        ? WITHDRAWN_STAFF_LABEL
        : WITHDRAWN_CUSTOMER_LABEL;
    default:
      return null;
  }
}

/** The status a customer's history card and receipt show for a round:
 *  its own, or "WITHDRAWN" for one they cancelled themselves (its status
 *  is CANCELLED; the reason tells it apart). */
export function customerRoundStatus(round: {
  status: string;
  cancelReason: string | null;
}): string {
  return round.status === "CANCELLED" && round.cancelReason === "WITHDRAWN"
    ? "WITHDRAWN"
    : round.status;
}

/** The Backoffice toast for rounds customers just withdrew (once each),
 *  as a bo.alerts message key and its values: "Customer cancelled order
 *  #A015 · Table 3", or "Customers cancelled 2 orders" when several came
 *  in together. */
export function describeWithdrawals(
  rounds: readonly { orderNumber: string; tableName: string | null }[],
):
  | { key: "withdrawnOne"; values: { number: string } }
  | { key: "withdrawnOneAt"; values: { number: string; table: string } }
  | { key: "withdrawnMany"; values: { count: number } } {
  if (rounds.length === 1) {
    const [round] = rounds;
    return round.tableName
      ? { key: "withdrawnOneAt", values: { number: round.orderNumber, table: round.tableName } }
      : { key: "withdrawnOne", values: { number: round.orderNumber } };
  }
  return { key: "withdrawnMany", values: { count: rounds.length } };
}
