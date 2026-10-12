/** The cancellations a customer is told about: the counter turned the
 *  order down, didn't decide in time, or someone at the table (or the
 *  customer themselves) cancelled it while it waited. */
export type ShownCancelReason = "REJECTED" | "EXPIRED" | "WITHDRAWN";

/** THE rule for "does the customer get the 'order ended' screen": only a
 *  CANCELLED round that had been sent and then turned down (REJECTED),
 *  left undecided (EXPIRED) or withdrawn by a customer (WITHDRAWN — so
 *  every phone at a table learns one of them cancelled it). A cart that
 *  was never sent (UNSUBMITTED), a cancellation without a reason, or any
 *  other status shows nothing. Shared by the server lookups and both cart
 *  pages. */
export function shownCancelReason(
  status: string,
  cancelReason: string | null | undefined,
): ShownCancelReason | null {
  if (status !== "CANCELLED") return null;
  return cancelReason === "REJECTED" ||
    cancelReason === "EXPIRED" ||
    cancelReason === "WITHDRAWN"
    ? cancelReason
    : null;
}
