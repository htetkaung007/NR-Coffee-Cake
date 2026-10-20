import { describe, it, expect } from "vitest";
import {
  CLEAR_LOGIN_THROTTLE,
  LOCKOUT_MS,
  MAX_FAILED_LOGINS,
  afterFailedLogin,
  checkLoginAllowed,
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
