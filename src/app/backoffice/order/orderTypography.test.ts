import { describe, it, expect } from "vitest";
import { moneyColor, moneyToneSx } from "./orderTypography";

describe("money tones", () => {
  it("is neutral (text.primary) by default", () => {
    expect(moneyColor()).toBe("text.primary");
  });

  it("uses the success text shade for income on Reports", () => {
    expect(moneyColor("income")).toBe("successText");
  });

  it("uses the brand primary for a menu card's price", () => {
    expect(moneyToneSx("price")).toMatchObject({ color: "primary.main" });
  });

  it("never colours money red", () => {
    for (const tone of ["neutral", "income", "price"] as const) {
      expect(moneyColor(tone)).not.toMatch(/^error/);
    }
  });
});
