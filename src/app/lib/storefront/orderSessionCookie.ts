/** HttpOnly cookie holding a Counter OrderSession's opaque token
 *  (OrderSession.token, not the numeric id — see orderSession.service.ts).
 *  Shared between the scan Route Handler (which sets/clears it) and
 *  Middleware (which only checks whether it's present) so the name
 *  never drifts between the two. */
export const COUNTER_SESSION_COOKIE = "counter_session_token";

/** Shared Set-Cookie options for COUNTER_SESSION_COOKIE — every write
 *  site (the scan Route Handler, startNextRound's cookie move in
 *  pollOrderStatusAction, and submitCartAction's move onto a new
 *  round) used to repeat this object literal; one canonical
 *  copy means they can't drift out of sync. `secure` comes from the
 *  request (lib/http/secureCookie — https only; the shop LAN is http),
 *  never from NODE_ENV. No Max-Age here, for the same
 *  reason the comment below gives — only ever passed to a
 *  `store.set(name, value, counterSessionCookieOptions(secure))` call to
 *  SET the cookie, never used to clear one (that's always its own
 *  explicit `{ maxAge: 0 }`). */
export function counterSessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
  };
}

// TABLE_SESSION_COOKIE was removed — the per-customer draft redesign
// (see CONTRIBUTOR_TOKEN_COOKIE below) moved everything Table-QR
// related onto tableId as the shared key instead: drafts before Send
// to Kitchen, and round status after it (see TableDraftService,
// TableSessionService.getActiveRoundForTable). Every phone at a table
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

/** Set-Cookie options for CONTRIBUTOR_TOKEN_COOKIE — kept a week; set
 *  only by the Table scan Route Handler. `secure` from the request, as
 *  above. */
export function contributorTokenCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

// No Max-Age is set on this cookie — it's a plain browser-session
// cookie (cleared when the browser closes). The database is the real
// lifecycle owner: a CART session that never places an order expires
// on its own after 40 minutes (see OrderSessionService's
// CART_ABANDON_MINUTES), and PAID clears the cookie immediately on
// the customer's next request (see markSessionsPaid's comment). A
// fixed cookie expiry on top of that would just be a second, easily
// out-of-sync copy of the same rule.
