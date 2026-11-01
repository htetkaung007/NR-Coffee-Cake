import { describe, it, expect } from "vitest";
import {
  CLEAR_LOGIN_THROTTLE,
  LOCKOUT_MS,
  MAX_FAILED_LOGINS,
  afterFailedLogin,
  checkLoginAllowed,
  checkAfterFailure,
  loginAttemptsSignal,
  loginLockedSignal,
  parseLoginAttempts,
  parseLoginLocked,
  shouldWarnAttempts,
  type LoginThrottleState,
} from "./loginThrottle";

const T0 = new Date("2026-10-19T10:00:00Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

/** `count` wrong passwords, one a minute from T0. */
function failures(count: number, from = CLEAR_LOGIN_THROTTLE) {
  let state: LoginThrottleState = from;
  for (let i = 0; i < count; i += 1) state = afterFailedLogin(state, at(i));
  return state;
}

describe("checkLoginAllowed", () => {
  it("allows an account with no failures", () => {
    expect(checkLoginAllowed(CLEAR_LOGIN_THROTTLE, T0)).toEqual({ allowed: true });
  });

  it("refuses a locked account and says how many whole minutes are left", () => {
    const state = { ...CLEAR_LOGIN_THROTTLE, lockedUntil: at(15) };
    expect(checkLoginAllowed(state, at(0.5))).toEqual({
      allowed: false,
      lockedUntil: at(15),
      retryInMinutes: 15,
    });
  });

  it("says at least 1 minute while any lock time is left", () => {
    const state = { ...CLEAR_LOGIN_THROTTLE, lockedUntil: at(15) };
    expect(checkLoginAllowed(state, at(14.99))).toMatchObject({
      allowed: false,
      retryInMinutes: 1,
    });
  });

  it("allows again once the lock has run out", () => {
    const state = { ...CLEAR_LOGIN_THROTTLE, lockedUntil: at(15) };
    expect(checkLoginAllowed(state, at(15))).toEqual({ allowed: true });
  });
});

describe("afterFailedLogin", () => {
  it("does not lock before the fifth failure", () => {
    const state = failures(MAX_FAILED_LOGINS - 1);
    expect(state.lockedUntil).toBeNull();
    expect(state.failedLoginCount).toBe(MAX_FAILED_LOGINS - 1);
    expect(checkLoginAllowed(state, at(4)).allowed).toBe(true);
  });

  it("locks for 15 minutes on the fifth failure within 15 minutes", () => {
    const state = failures(MAX_FAILED_LOGINS);
    expect(state.lockedUntil).toEqual(new Date(at(4).getTime() + LOCKOUT_MS));
    expect(checkLoginAllowed(state, at(5)).allowed).toBe(false);
  });

  it("starts a new run when a failure comes after the 15-minute window", () => {
    const old = failures(4);
    const state = afterFailedLogin(old, at(20));
    expect(state).toEqual({
      failedLoginCount: 1,
      firstFailedLoginAt: at(20),
      lockedUntil: null,
    });
  });

  it("starts from one again after a lock has run out", () => {
    const locked = failures(MAX_FAILED_LOGINS);
    const state = afterFailedLogin(locked, at(30));
    expect(state).toEqual({
      failedLoginCount: 1,
      firstFailedLoginAt: at(30),
      lockedUntil: null,
    });
  });
});

describe("afterFailedLogin — edge cases", () => {
  it("locks on exactly the fifth failure, not the fourth", () => {
    expect(failures(4).lockedUntil).toBeNull();
    expect(failures(5).lockedUntil).not.toBeNull();
  });

  it("keeps an active lock when a parallel wrong attempt lands during it", () => {
    const locked = failures(MAX_FAILED_LOGINS);
    expect(afterFailedLogin(locked, at(5))).toEqual(locked);
  });

  it("restarts the count when a failure comes after the lock expired", () => {
    const locked = failures(MAX_FAILED_LOGINS);
    const afterExpiry = at(4 + LOCKOUT_MS / 60_000);
    const state = afterFailedLogin(locked, afterExpiry);
    expect(state.failedLoginCount).toBe(1);
    expect(state.lockedUntil).toBeNull();
  });
});

describe("the lock's signal to the sign-in form", () => {
  it("round-trips the minutes left", () => {
    expect(parseLoginLocked(loginLockedSignal(12))).toBe(12);
  });

  it("reads anything else as not locked", () => {
    for (const error of ["CredentialsSignin", "LOGIN_LOCKED:", "LOGIN_LOCKED:x", null]) {
      expect(parseLoginLocked(error)).toBeNull();
    }
  });
});

describe("checkAfterFailure", () => {
  it("says how many tries are left before the lock", () => {
    expect(checkAfterFailure(failures(2), at(1))).toEqual({
      allowed: true,
      attemptsLeft: 3,
    });
  });

  it("says locked, with the minutes, on the failure that locks", () => {
    expect(checkAfterFailure(failures(MAX_FAILED_LOGINS), at(4))).toMatchObject({
      allowed: false,
      retryInMinutes: 15,
    });
  });
});

describe("shouldWarnAttempts", () => {
  it("warns from 3 tries left, not at 4", () => {
    expect(shouldWarnAttempts(4)).toBe(false);
    expect(shouldWarnAttempts(3)).toBe(true);
    expect(shouldWarnAttempts(1)).toBe(true);
  });
});

describe("the tries-left signal to the sign-in form", () => {
  it("round-trips the tries left", () => {
    expect(parseLoginAttempts(loginAttemptsSignal(3))).toBe(3);
  });

  it("reads anything else as no warning", () => {
    for (const error of ["CredentialsSignin", "LOGIN_LOCKED:3", "LOGIN_ATTEMPTS_LEFT:x", null]) {
      expect(parseLoginAttempts(error)).toBeNull();
    }
  });
});
