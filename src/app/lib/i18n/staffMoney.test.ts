import { describe, it, expect } from "vitest";
import { createTranslator } from "next-intl";
import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";
import { staffMoney } from "./staffMoney";

const moneyIn = (locale: "en" | "my") =>
  staffMoney(
    createTranslator({
      locale,
      messages: locale === "en" ? en : my,
      namespace: "bo.money",
    }),
  );

describe("staffMoney", () => {
  it("writes English amounts with MMK", () => {
    expect(moneyIn("en").amount(4500)).toBe("4,500 MMK");
    expect(moneyIn("en").delta(500)).toBe("+500 MMK");
    expect(moneyIn("en").currency).toBe("MMK");
  });

  it("writes Myanmar amounts with ကျပ် and the same 0–9 digits", () => {
    expect(moneyIn("my").amount(1234567)).toBe("1,234,567 ကျပ်");
    expect(moneyIn("my").delta(500)).toBe("+500 ကျပ်");
    expect(moneyIn("my").currency).toBe("ကျပ်");
  });

  it("uses the customers' Myanmar money word", () => {
    expect(moneyIn("my").amount(10)).toBe(my.common.price.replace("{amount}", "10"));
  });
});
