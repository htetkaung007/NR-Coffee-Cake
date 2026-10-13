import { describe, it, expect } from "vitest";
import { shopInitials } from "./shopInitials";

describe("shopInitials", () => {
  it("takes the first letter of the first two words", () => {
    expect(shopInitials("Café Maw")).toBe("CM");
  });

  it("uses one letter for a one-word name", () => {
    expect(shopInitials("Starbucks")).toBe("S");
  });

  it("never takes more than two words", () => {
    expect(shopInitials("Nyein Ram Coffee Cake")).toBe("NR");
  });

  it("upper-cases Latin letters", () => {
    expect(shopInitials("café maw")).toBe("CM");
  });

  it("keeps a Burmese letter whole, with its marks", () => {
    expect(shopInitials("ကော်ဖီ ဆိုင်")).toBe("ကော်ဆို");
  });

  it("ignores extra spaces", () => {
    expect(shopInitials("  Café   Maw  ")).toBe("CM");
  });

  it("is empty for no name", () => {
    expect(shopInitials("")).toBe("");
    expect(shopInitials(null)).toBe("");
  });
});
