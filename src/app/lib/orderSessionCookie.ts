import { cookies } from "next/headers";

// One cookie name, one place it's defined — every place that reads or
// writes the counter session cookie imports this instead of repeating
// the string, so a rename later only touches this file.
const COUNTER_SESSION_COOKIE = "counterOrderSessionId";

// 24 hours — a safety net upper bound, not the primary "session over"
// signal. The primary signal is OrderSession.status turning PAID
// (checked in OrderSessionService.resolveCounterSession). This expiry
// only exists to eventually free up a cookie nobody ever paid or
// returned to (device lost, tab abandoned for days). See
// order-system-design.md Section 4.
const COUNTER_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24;

/** Does one thing: reads the counter session id out of the request's
 *  cookies, or null if there isn't one (first visit, cleared browser
 *  data, or expired). Never throws — a missing/invalid cookie is a
 *  normal case the caller is expected to handle, not an error. */
export async function getCounterSessionIdFromCookie(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(COUNTER_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const parsed = Number(raw);
  return Number.isInteger(parsed) ? parsed : null;
}

/** Does one thing: writes a session id into the response's cookies.
 *  httpOnly so client-side JS can't read/tamper with it — the only
 *  code that needs this value is server-side Controller code. */
export async function setCounterSessionCookie(sessionId: number) {
  const store = await cookies();
  store.set(COUNTER_SESSION_COOKIE, String(sessionId), {
    httpOnly: true,
    maxAge: COUNTER_SESSION_MAX_AGE_SECONDS,
    sameSite: "lax",
    path: "/",
  });
}
