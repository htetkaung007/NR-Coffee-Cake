import { describe, it, expect } from "vitest";
import {
  formatAmount,
  formatCompactAmount,
  formatMoneyDelta,
} from "./orderFormat";

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

describe("formatCompactAmount", () => {
  it.each([
    [0, "0"],
    [999, "999"],
  ])("leaves amounts under a thousand as they are (%s → %s)", (value, expected) => {
    expect(formatCompactAmount(value)).toBe(expected);
  });

  it.each([
    [1000, "1k"],
    [12500, "12.5k"],
    [24370, "24.4k"],
    [100000, "100k"],
    [999949, "999.9k"],
  ])("writes thousands as k with at most one decimal (%s → %s)", (value, expected) => {
    expect(formatCompactAmount(value)).toBe(expected);
  });

  it.each([
    [999950, "1M"],
    [999999, "1M"],
  ])("rolls over to M instead of ever writing 1000k (%s → %s)", (value, expected) => {
    expect(formatCompactAmount(value)).toBe(expected);
  });

  it("rounds millions to one decimal and drops a trailing .0", () => {
    expect(formatCompactAmount(1250000)).toBe("1.3M");
    expect(formatCompactAmount(2000000)).toBe("2M");
  });

  it.each([
    [-999, "-999"],
    [-24370, "-24.4k"],
    [-999950, "-1M"],
  ])("keeps the sign of a negative amount (%s → %s)", (value, expected) => {
    expect(formatCompactAmount(value)).toBe(expected);
  });
});
