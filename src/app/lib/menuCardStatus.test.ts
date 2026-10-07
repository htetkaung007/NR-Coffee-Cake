import { describe, it, expect } from "vitest";
import { menuCardStatus } from "./menuCardStatus";

const inStock = { stockQuantity: 12, isManuallyDisabled: false, isHiddenHere: false };

describe("menuCardStatus", () => {
  it("is available when switched on, in stock and shown here", () => {
    expect(menuCardStatus(inStock)).toBe("available");
  });

  it("is sold out at stock 0 with the switch on", () => {
    expect(menuCardStatus({ ...inStock, stockQuantity: 0 })).toBe("soldOut");
  });

  it("is unavailable when switched off, even with stock left", () => {
    expect(menuCardStatus({ ...inStock, isManuallyDisabled: true })).toBe("unavailable");
  });

  it("shows unavailable over sold out when switched off at stock 0", () => {
    expect(
      menuCardStatus({ ...inStock, stockQuantity: 0, isManuallyDisabled: true }),
    ).toBe("unavailable");
  });

  it("shows hidden over everything else", () => {
    expect(
      menuCardStatus({ stockQuantity: 0, isManuallyDisabled: true, isHiddenHere: true }),
    ).toBe("hidden");
  });
});
