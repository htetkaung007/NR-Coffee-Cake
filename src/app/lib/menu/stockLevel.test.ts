import { describe, it, expect } from "vitest";
import { LOW_STOCK_THRESHOLD, stockBadge } from "./stockLevel";

describe("stockBadge", () => {
  it("reads 0 as sold out", () => {
    expect(stockBadge(0)).toEqual({ kind: "soldOut" });
  });

  it("reads a negative quantity as sold out too", () => {
    expect(stockBadge(-2).kind).toBe("soldOut");
  });

  it("reads 1 as low", () => {
    expect(stockBadge(1)).toEqual({ kind: "low" });
  });

  it("reads 4 as low — the last low number", () => {
    expect(stockBadge(4)).toEqual({ kind: "low" });
  });

  it("reads 5 as in stock — the threshold itself is not low", () => {
    expect(LOW_STOCK_THRESHOLD).toBe(5);
    expect(stockBadge(5)).toEqual({ kind: "inStock" });
  });

  it("reads 6 as in stock", () => {
    expect(stockBadge(6)).toEqual({ kind: "inStock" });
  });
});
