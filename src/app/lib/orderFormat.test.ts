import { describe, it, expect } from "vitest";
import { formatAmount, formatMoneyDelta } from "./orderFormat";

describe("formatAmount", () => {
  it("groups thousands with commas and appends the currency", () => {
    expect(formatAmount(30500)).toBe("30,500 MMK");
  });

  it("shows zero as 0 with the currency", () => {
    expect(formatAmount(0)).toBe("0 MMK");
  });

  it("leaves amounts under 1,000 ungrouped", () => {
    expect(formatAmount(500)).toBe("500 MMK");
  });
});

describe("formatMoneyDelta", () => {
  it("prefixes the formatted amount with a plus sign", () => {
    expect(formatMoneyDelta(1500)).toBe("+1,500 MMK");
  });
});
