import { describe, it, expect } from "vitest";
import { customerWords } from "./customerWords";

describe("customerWords", () => {
  it("prices in Kyats with the shared digits in Myanmar", () => {
    const words = customerWords("my");
    expect(words.price(1000)).toBe("1,000 ကျပ်");
    expect(words.priceDelta(500)).toBe("+500 ကျပ်");
    expect(words.free).toBe("အခမဲ့");
  });

  it("prices in Kyats in English", () => {
    const words = customerWords("en");
    expect(words.price(4500)).toBe("4,500 Kyats");
    expect(words.free).toBe("Free");
  });
});
