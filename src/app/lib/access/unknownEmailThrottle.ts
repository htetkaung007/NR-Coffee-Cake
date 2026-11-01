import {
  CLEAR_LOGIN_THROTTLE,
  afterFailedLogin,
  checkAfterFailure,
  checkLoginAllowed,
  type FailedLoginCheck,
  type LoginCheck,
  type LoginThrottleState,
} from "./loginThrottle";

const MAX_ENTRIES = 1000;

/**
 * The login rule for an email with no User row — there's nowhere to store
 * its failures, and without a lock of its own the lock message would tell
 * which emails exist. The same rule (loginThrottle) on a counter held in
 * memory, in insertion order: a failure moves its entry to the end, and a
 * full map evicts the first (the one that failed longest ago) — it never
 * refuses or skips counting.
 *
 * In ONE Node process: it resets on a restart, and would split across
 * processes under PM2 cluster mode or several instances (CLAUDE.md §13).
 */
export function createUnknownEmailThrottle(maxEntries = MAX_ENTRIES) {
  const entries = new Map<string, LoginThrottleState>();
  const keyFor = (email: string) => email.trim().toLowerCase();

  return {
    check(email: string, now: Date): LoginCheck {
      const state = entries.get(keyFor(email)) ?? CLEAR_LOGIN_THROTTLE;
      return checkLoginAllowed(state, now);
    },

    /** Counts a failure; says whether it's locked now, or the tries left. */
    recordFailure(email: string, now: Date): FailedLoginCheck {
      const key = keyFor(email);
      const next = afterFailedLogin(
        entries.get(key) ?? CLEAR_LOGIN_THROTTLE,
        now,
      );
      entries.delete(key);
      if (entries.size >= maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest !== undefined) entries.delete(oldest);
      }
      entries.set(key, next);
      return checkAfterFailure(next, now);
    },
  };
}
