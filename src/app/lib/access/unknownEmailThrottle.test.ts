import { describe, it, expect } from "vitest";
import { MAX_FAILED_LOGINS } from "./loginThrottle";
import { createUnknownEmailThrottle } from "./unknownEmailThrottle";

const T0 = new Date("2026-11-01T10:00:00Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

function failTimes(
  throttle: ReturnType<typeof createUnknownEmailThrottle>,
  email: string,
  times: number,
) {
  let result = throttle.check(email, T0);
  for (let i = 0; i < times; i += 1) result = throttle.recordFailure(email, T0);
  return result;
}

describe("createUnknownEmailThrottle", () => {
  it("allows an email it has never seen", () => {
    expect(createUnknownEmailThrottle().check("a@x.com", T0)).toEqual({ allowed: true });
  });

  it("locks on the same failure a real account does, with the same minutes", () => {
    const throttle = createUnknownEmailThrottle();
    expect(failTimes(throttle, "a@x.com", MAX_FAILED_LOGINS - 1).allowed).toBe(true);
    expect(throttle.recordFailure("a@x.com", T0)).toMatchObject({
      allowed: false,
      retryInMinutes: 15,
    });
  });

  it("allows again once the lock has run out", () => {
    const throttle = createUnknownEmailThrottle();
    failTimes(throttle, "a@x.com", MAX_FAILED_LOGINS);
    expect(throttle.check("a@x.com", at(15)).allowed).toBe(true);
  });

  it("counts an email the same whatever its capital letters", () => {
    const throttle = createUnknownEmailThrottle();
    failTimes(throttle, "A@X.com", MAX_FAILED_LOGINS);
    expect(throttle.check("a@x.com", T0).allowed).toBe(false);
  });

  it("evicts the oldest entry when the cap is full, and still counts the new one", () => {
    const throttle = createUnknownEmailThrottle(2);
    failTimes(throttle, "old@x.com", MAX_FAILED_LOGINS);
    failTimes(throttle, "mid@x.com", MAX_FAILED_LOGINS);
    failTimes(throttle, "new@x.com", MAX_FAILED_LOGINS);
    expect(throttle.check("old@x.com", T0).allowed).toBe(true);
    expect(throttle.check("mid@x.com", T0).allowed).toBe(false);
    expect(throttle.check("new@x.com", T0).allowed).toBe(false);
  });

  it("counts an entry's age from its latest failure, not its first", () => {
    const throttle = createUnknownEmailThrottle(2);
    failTimes(throttle, "first@x.com", MAX_FAILED_LOGINS);
    failTimes(throttle, "second@x.com", 1);
    // first@ failed again, so second@ is now the oldest.
    throttle.recordFailure("first@x.com", T0);
    failTimes(throttle, "third@x.com", 1);
    expect(throttle.check("first@x.com", T0).allowed).toBe(false);
  });
});
