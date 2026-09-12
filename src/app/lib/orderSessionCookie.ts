/** HttpOnly cookie holding a Counter OrderSession's opaque token
 *  (OrderSession.token, not the numeric id — see orderSession.service.ts).
 *  Shared between the scan Route Handler (which sets/clears it) and
 *  Middleware (which only checks whether it's present) so the name
 *  never drifts between the two. */
export const COUNTER_SESSION_COOKIE = "counter_session_token";

// TABLE_SESSION_COOKIE was removed — the per-customer draft redesign
// (see CONTRIBUTOR_TOKEN_COOKIE below) moved everything Table-QR
// related onto tableId as the shared key instead: drafts before Send
// to Kitchen, and round status after it (see TableDraftService,
// OrderSessionService.getActiveRoundForTable). Every phone at a table
// needs to see the SAME thing regardless of which phone did what, and
// keying that off tableId achieves that automatically — keying it off
// a session-token cookie (this constant's old job) didn't, which was
// the bug the redesign fixed (see the "Round 2 sync bug" design
// discussion).

/** Per-customer draft-ownership token — see the Table-QR per-customer
 *  draft design (Order.contributorToken). Unlike COUNTER/TABLE_SESSION
 *  above (one value each), this cookie holds a JSON map of
 *  { [tableId]: token } since one browser may carry drafts for several
 *  different tables over its lifetime (see contributorToken.ts for the
 *  read/write helpers — this constant is just the shared name so the
 *  scan Route Handler and the draft Server Actions can't drift). */
export const CONTRIBUTOR_TOKEN_COOKIE = "table_contributor_tokens";

// No Max-Age is set on this cookie — it's a plain browser-session
// cookie (cleared when the browser closes). The database is the real
// lifecycle owner: a CART session that never places an order expires
// on its own after 40 minutes (see OrderSessionService's
// CART_ABANDON_MINUTES), and PAID clears the cookie immediately on
// the customer's next request (see markSessionPaid's comment). A
// fixed cookie expiry on top of that would just be a second, easily
// out-of-sync copy of the same rule.
