import { describe, it, expect } from "vitest";
import { percentOf } from "./percent";

describe("percentOf", () => {
  it("is the part as a percent of the whole", () => {
    expect(percentOf(1, 4)).toBe(25);
  });

  it("rounds to a whole percent by default", () => {
    expect(percentOf(58, 94)).toBe(62); // 61.7
  });

  it("rounds a half up", () => {
    expect(percentOf(1, 8)).toBe(13); // 12.5
  });

  it("rounds to the number of decimals asked for", () => {
    expect(percentOf(1, 3, 1)).toBe(33.3);
    expect(percentOf(2, 3, 1)).toBe(66.7);
  });

  it("is 0 when the whole is 0, never NaN or Infinity", () => {
    expect(percentOf(5, 0)).toBe(0);
    expect(percentOf(0, 0, 1)).toBe(0);
  });

  it("can be negative for a negative part", () => {
    expect(percentOf(-25, 100)).toBe(-25);
  });

  it("gives 0, never -0, for a negative part too small to round", () => {
    // toBe uses Object.is, which tells -0 from 0.
    expect(percentOf(-1, 10000, 1)).toBe(0);
  });
});
