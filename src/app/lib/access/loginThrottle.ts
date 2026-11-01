/**
 * Login rate limit (OWASP WSTG-ATHN-03) — the rule only, pure: an EMAIL
 * is locked for LOCKOUT_MS after MAX_FAILED_LOGINS failed attempts within
 * FAILURE_WINDOW_MS; a successful login clears it. Counted per email, not
 * per IP — the whole shop shares one LAN / Starlink address. The state
 * lives on the User row (AppService.verifyCredentials reads and writes
 * it); an unknown email has no row, so the same rule runs on an in-memory
 * counter (unknownEmailThrottle) — it gets the same lock message, so the
 * message never tells which emails exist.
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

/** The state after a wrong password: counts it in the current window (a
 *  failure after the window, or after a lock — which clears the run —
 *  starts a new one); the MAX_FAILED_LOGINS-th failure locks the account.
 *  While a lock is running nothing changes: parallel attempts that passed
 *  the first check before it began land here, and must never lift it. */
export function afterFailedLogin(
  state: LoginThrottleState,
  now: Date,
): LoginThrottleState {
  if (!checkLoginAllowed(state, now).allowed) return state;
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

/** What a wrong password led to: locked, or how many tries are left. */
export type FailedLoginCheck =
  | { allowed: true; attemptsLeft: number }
  | Extract<LoginCheck, { allowed: false }>;

/** Reads the state afterFailedLogin returned. */
export function checkAfterFailure(
  state: LoginThrottleState,
  now: Date,
): FailedLoginCheck {
  const check = checkLoginAllowed(state, now);
  return check.allowed
    ? { allowed: true, attemptsLeft: MAX_FAILED_LOGINS - state.failedLoginCount }
    : check;
}

/** The sign-in form warns from this many tries left. */
const WARN_FROM_ATTEMPTS_LEFT = 3;

export function shouldWarnAttempts(attemptsLeft: number) {
  return attemptsLeft <= WARN_FROM_ATTEMPTS_LEFT;
}

const LOGIN_LOCKED_PREFIX = "LOGIN_LOCKED:";
const LOGIN_ATTEMPTS_PREFIX = "LOGIN_ATTEMPTS_LEFT:";

/** What authorize() throws for a locked email: NextAuth hands the message
 *  to signIn({ redirect: false }) as `error`. A code and the minutes only —
 *  never the email or anything secret. */
export function loginLockedSignal(retryInMinutes: number) {
  return `${LOGIN_LOCKED_PREFIX}${retryInMinutes}`;
}

/** The minutes left from a signIn `error`; null — not a lock. */
export function parseLoginLocked(error: string | null | undefined) {
  if (!error?.startsWith(LOGIN_LOCKED_PREFIX)) return null;
  const minutes = error.slice(LOGIN_LOCKED_PREFIX.length);
  return /^\d+$/.test(minutes) ? Number(minutes) : null;
}

/** What authorize() throws for a wrong password with few tries left. */
export function loginAttemptsSignal(attemptsLeft: number) {
  return `${LOGIN_ATTEMPTS_PREFIX}${attemptsLeft}`;
}

/** The tries left from a signIn `error`; null — no warning. */
export function parseLoginAttempts(error: string | null | undefined) {
  if (!error?.startsWith(LOGIN_ATTEMPTS_PREFIX)) return null;
  const attempts = error.slice(LOGIN_ATTEMPTS_PREFIX.length);
  return /^\d+$/.test(attempts) ? Number(attempts) : null;
}
