/** The cancellations a customer is told about: the counter turned the
 *  order down, or didn't decide in time. */
export type ShownCancelReason = "REJECTED" | "EXPIRED";

/** THE rule for "does the customer get the 'wasn't accepted' screen":
 *  only a CANCELLED round that had been sent and then turned down
 *  (REJECTED) or left undecided (EXPIRED). A cart that was never sent
 *  (UNSUBMITTED), a cancellation without a reason, or any other status
 *  shows nothing. Shared by the server lookups and both cart pages. */
export function shownCancelReason(
  status: string,
  cancelReason: string | null | undefined,
): ShownCancelReason | null {
  if (status !== "CANCELLED") return null;
  return cancelReason === "REJECTED" || cancelReason === "EXPIRED"
    ? cancelReason
    : null;
}
