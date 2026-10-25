/**
 * Login rate limit (OWASP WSTG-ATHN-03) — the rule only, pure: an EMAIL
 * is locked for LOCKOUT_MS after MAX_FAILED_LOGINS failed attempts within
 * FAILURE_WINDOW_MS; a successful login clears it. Counted per email, not
 * per IP — the whole shop shares one LAN / Starlink address. The state
 * lives on the User row (AppService.verifyCredentials reads and writes
 * it); an unknown email has no row, so it's never "locked" — the sign-in
 * form shows the same generic error for it as for a wrong password.
 */

export const MAX_FAILED_LOGINS = 5;
const FAILURE_WINDOW_MS = 15 * 60_000;
export const LOCKOUT_MS = 15 * 60_000;

/** What's stored per user (User.failedLoginCount / firstFailedLoginAt /
 *  lockedUntil). */
export interface LoginThrottleState {
  failedLoginCount: number;
  /** When the current run of failures started (null: none). */
  firstFailedLoginAt: Date | null;
  lockedUntil: Date | null;
}

export const CLEAR_LOGIN_THROTTLE: LoginThrottleState = {
  failedLoginCount: 0,
  firstFailedLoginAt: null,
  lockedUntil: null,
};

export type LoginCheck =
  | { allowed: true }
  | { allowed: false; lockedUntil: Date; retryInMinutes: number };

/** May this account try a password right now? While locked: no, with the
 *  whole minutes left (rounded up, at least 1). */
export function checkLoginAllowed(
  state: LoginThrottleState,
  now: Date,
): LoginCheck {
  const { lockedUntil } = state;
  if (lockedUntil === null || lockedUntil <= now) return { allowed: true };
  return {
    allowed: false,
    lockedUntil,
    retryInMinutes: Math.max(
      1,
      Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000),
    ),
  };
}

/** The state after a wrong password (only ever asked while allowed —
 *  a locked account isn't checked at all): counts it in the current
 *  window (a failure after the window, or after a lock — which clears the
 *  run — starts a new one); the MAX_FAILED_LOGINS-th failure locks the
 *  account. */
export function afterFailedLogin(
  state: LoginThrottleState,
  now: Date,
): LoginThrottleState {
  const runStart = state.firstFailedLoginAt;
  const inWindow =
    runStart !== null && now.getTime() - runStart.getTime() < FAILURE_WINDOW_MS;
  const failedLoginCount = inWindow ? state.failedLoginCount + 1 : 1;
  if (failedLoginCount >= MAX_FAILED_LOGINS) {
    return {
      failedLoginCount: 0,
      firstFailedLoginAt: null,
      lockedUntil: new Date(now.getTime() + LOCKOUT_MS),
    };
  }
  return {
    failedLoginCount,
    firstFailedLoginAt: inWindow ? runStart : now,
    lockedUntil: null,
  };
}
