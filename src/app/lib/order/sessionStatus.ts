// A session that has reached one of these statuses is "done" — a new
// scan (Table QR) or a new cookie-matched visit (Counter QR) must not
// land inside it anymore. PAID is the expected/common case (design doc
// section 3). COMPLETED and CANCELLED are treated the same way here so
// a cancelled or already-served session can't silently keep a table or
// a customer's cookie locked forever.
const TERMINAL_STATUSES = ["PAID", "COMPLETED", "CANCELLED"];

/** The single definition of "is this session done" — pure, so the
 *  client-safe rules (lib/order/tableOccupancy.ts) share it with the
 *  Services (OrderSessionService re-exports it) instead of each keeping
 *  their own copy of TERMINAL_STATUSES, which would drift out of sync
 *  the moment one of them is updated and the others aren't. */
export function isSessionTerminal(status: string) {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * How long a Counter session may sit unsent in CART before it counts as
 * abandoned — counted from the SCAN (createdAt), not from the customer's
 * last activity: the session is only the scan's proof of presence; the
 * cart itself lives in the browser (lib/cart/browserCart), so an expired
 * session loses nothing — the customer just scans again to send.
 * Checked lazily wherever a session is resolved from its cookie (the
 * scan, getActiveSessionByToken, getOrStartCartRound), never on a timer:
 * nothing polls while a session is still CART, so it's noticed on the
 * customer's next request (a scan, a page load, Send), not the moment
 * the 15 minutes pass.
 */
export const CART_ABANDON_MINUTES = 15;

/** A session still in CART longer than CART_ABANDON_MINUTES after its
 *  scan. Only a session that has NEVER been sent can still be CART, so
 *  the status alone tells; a round that left CART once (even if it was
 *  later rejected) is never "abandoned". */
export function isAbandonedCart(
  session: { status: string; createdAt: Date },
  now: Date = new Date(),
) {
  if (session.status !== "CART") return false;
  return (
    now.getTime() - session.createdAt.getTime() > CART_ABANDON_MINUTES * 60_000
  );
}

/** A PENDING_APPROVAL round whose approval window has run out — it
 *  counts as timed out even before anything has written EXPIRED (that
 *  happens lazily, see OrderSessionService.getSessionStatus). The one
 *  definition, shared by that lazy expiry and the read-only checks that
 *  must not write. */
export function isPastApprovalWindow(
  session: { status: string; approvalExpiresAt: Date | null },
  now: Date = new Date(),
) {
  return (
    session.status === "PENDING_APPROVAL" &&
    session.approvalExpiresAt !== null &&
    session.approvalExpiresAt < now
  );
}
