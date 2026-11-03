import { describe, it, expect } from "vitest";
import { CART_ABANDON_MINUTES, isAbandonedCart } from "./sessionStatus";

const NOW = new Date("2026-11-03T10:00:00Z");
const minutesAgo = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000);

describe("isAbandonedCart", () => {
  it("gives an unsent Counter cart 15 minutes", () => {
    expect(CART_ABANDON_MINUTES).toBe(15);
  });

  it("keeps a cart scanned less than 15 minutes ago", () => {
    expect(
      isAbandonedCart({ status: "CART", createdAt: minutesAgo(14) }, NOW),
    ).toBe(false);
  });

  it("counts from the scan (createdAt), not from the last activity", () => {
    expect(
      isAbandonedCart({ status: "CART", createdAt: minutesAgo(16) }, NOW),
    ).toBe(true);
  });

  it("never treats a round that was sent as abandoned", () => {
    for (const status of ["PENDING_APPROVAL", "PENDING", "COOKING", "PAID"]) {
      expect(isAbandonedCart({ status, createdAt: minutesAgo(600) }, NOW)).toBe(
        false,
      );
    }
  });
});
