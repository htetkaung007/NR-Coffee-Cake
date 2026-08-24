/** HttpOnly cookie holding a Counter OrderSession's opaque token
 *  (OrderSession.token, not the numeric id — see orderSession.service.ts).
 *  Shared between the scan Route Handler (which sets/clears it) and
 *  Middleware (which only checks whether it's present) so the name
 *  never drifts between the two. */
export const COUNTER_SESSION_COOKIE = "counter_session_token";

// No Max-Age is set on this cookie — it's a plain browser-session
// cookie (cleared when the browser closes). The database is the real
// lifecycle owner: a CART session that never places an order expires
// on its own after 40 minutes (see OrderSessionService's
// CART_ABANDON_MINUTES), and PAID clears the cookie immediately on
// the customer's next request (see markSessionPaid's comment). A
// fixed cookie expiry on top of that would just be a second, easily
// out-of-sync copy of the same rule.
