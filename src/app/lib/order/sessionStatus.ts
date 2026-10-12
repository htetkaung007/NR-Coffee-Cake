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
