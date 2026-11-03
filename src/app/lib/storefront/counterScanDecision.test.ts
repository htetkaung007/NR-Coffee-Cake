import { describe, it, expect } from "vitest";
import { decideCounterScan, type ScannedSession } from "./counterScanDecision";

const NOW = new Date("2026-11-03T10:00:00Z");
const minutesAgo = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000);
const inMinutes = (minutes: number) =>
  new Date(NOW.getTime() + minutes * 60_000);

function session(overrides: Partial<ScannedSession>): ScannedSession {
  return {
    status: "CART",
    createdAt: minutesAgo(1),
    approvalExpiresAt: null,
    ...overrides,
  };
}

const decide = (current: ScannedSession | null, hasOpenBillRoot = false) =>
  decideCounterScan(current, { hasOpenBillRoot }, NOW);

describe("decideCounterScan", () => {
  it("starts a new session when the browser has no cookie", () => {
    expect(decide(null)).toBe("start");
  });

  it("reuses an open bill", () => {
    for (const status of ["PENDING", "COOKING"]) {
      expect(decide(session({ status }))).toBe("reuse");
    }
  });

  it("reuses a cart that is still within its time", () => {
    expect(decide(session({ status: "CART", createdAt: minutesAgo(10) }))).toBe(
      "reuse",
    );
  });

  it("reuses a round still waiting for approval within its window", () => {
    expect(
      decide(
        session({
          status: "PENDING_APPROVAL",
          approvalExpiresAt: inMinutes(4),
        }),
      ),
    ).toBe("reuse");
  });

  it("starts a new session at once for a finished bill (paid, rejected, expired, withdrawn)", () => {
    for (const status of ["PAID", "COMPLETED", "CANCELLED"]) {
      expect(decide(session({ status }))).toBe("start");
    }
  });

  it("cancels an abandoned cart and starts a new session", () => {
    expect(decide(session({ status: "CART", createdAt: minutesAgo(16) }))).toBe(
      "cancelAbandonedThenStart",
    );
  });

  it("goes back to the bill's open first round when only an Order More round ended", () => {
    expect(decide(session({ status: "CANCELLED" }), true)).toBe(
      "reuseBillRoot",
    );
  });

  it("treats a round past its approval window as ended, even before EXPIRED is written", () => {
    const overdue = session({
      status: "PENDING_APPROVAL",
      approvalExpiresAt: minutesAgo(1),
    });
    expect(decide(overdue)).toBe("start");
    expect(decide(overdue, true)).toBe("reuseBillRoot");
  });

  it("never replaces an open bill, even when its first round is open too", () => {
    expect(decide(session({ status: "COOKING" }), true)).toBe("reuse");
  });
});
