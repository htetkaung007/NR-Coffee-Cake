import { describe, it, expect } from "vitest";
import { formatVoidReasonCounts, summarizeVoids } from "./voidReport";

describe("summarizeVoids", () => {
  it("counts units and their value at the line's snapshot prices, add-ons included", () => {
    const summary = summarizeVoids([
      // 2 Lattes at 2,000 + a 500 shot each → 5,000.
      { reason: "WRONG_ITEM", quantity: 2, unitPrice: 2000, addonUnitPrices: [500] },
      { reason: "OTHER", quantity: 1, unitPrice: 3000, addonUnitPrices: [] },
    ]);
    expect(summary.count).toBe(3);
    expect(summary.value).toBe(8000);
  });

  it("lists every reason in order, zeros included", () => {
    const summary = summarizeVoids([
      { reason: "OTHER", quantity: 1, unitPrice: 3000, addonUnitPrices: [] },
    ]);
    expect(summary.reasons).toEqual([
      { reason: "CUSTOMER_CHANGED_MIND", count: 0, value: 0 },
      { reason: "WRONG_ITEM", count: 0, value: 0 },
      { reason: "OTHER", count: 1, value: 3000 },
    ]);
  });

  it("is all zeros with no voids", () => {
    expect(summarizeVoids([])).toMatchObject({ count: 0, value: 0 });
  });
});

describe("formatVoidReasonCounts", () => {
  it("names the non-zero reasons only", () => {
    const { reasons } = summarizeVoids([
      { reason: "WRONG_ITEM", quantity: 2, unitPrice: 1000, addonUnitPrices: [] },
      { reason: "OTHER", quantity: 1, unitPrice: 1000, addonUnitPrices: [] },
    ]);
    expect(formatVoidReasonCounts(reasons)).toBe("Wrong item 2 · Other 1");
  });

  it("is empty when nothing was voided", () => {
    expect(formatVoidReasonCounts(summarizeVoids([]).reasons)).toBe("");
  });
});
