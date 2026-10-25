import { describe, expect, it } from "vitest";
import {
  POPULAR_DAYS,
  POPULAR_MIN_SOLD,
  POPULAR_TOP,
  popularMenuIds,
  popularSalesRange,
} from "./popularMenus";
import { dayRangeUtc } from "../shopDay";

describe("popularMenuIds", () => {
  it("looks at the last 7 shop days, the top 3, from 5 sold", () => {
    expect([POPULAR_DAYS, POPULAR_TOP, POPULAR_MIN_SOLD]).toEqual([7, 3, 5]);
  });

  it("returns the top 3 menus by quantity sold, best first", () => {
    const sales = [
      { menuId: 1, quantity: 6 },
      { menuId: 2, quantity: 20 },
      { menuId: 3, quantity: 9 },
      { menuId: 4, quantity: 12 },
    ];
    expect(popularMenuIds(sales)).toEqual([2, 4, 3]);
  });

  it("leaves out a menu that sold fewer than 5", () => {
    const sales = [
      { menuId: 1, quantity: 4 },
      { menuId: 2, quantity: 5 },
    ];
    expect(popularMenuIds(sales)).toEqual([2]);
  });

  it("returns only those that qualify when fewer than 3 do", () => {
    const sales = [
      { menuId: 1, quantity: 8 },
      { menuId: 2, quantity: 1 },
      { menuId: 3, quantity: 3 },
    ];
    expect(popularMenuIds(sales)).toEqual([1]);
  });

  it("returns nothing when nothing sold enough", () => {
    expect(popularMenuIds([{ menuId: 1, quantity: 4 }])).toEqual([]);
    expect(popularMenuIds([])).toEqual([]);
  });

  it("breaks a tie with the lower menu id first", () => {
    const sales = [
      { menuId: 9, quantity: 7 },
      { menuId: 3, quantity: 7 },
      { menuId: 5, quantity: 7 },
      { menuId: 1, quantity: 7 },
    ];
    expect(popularMenuIds(sales)).toEqual([1, 3, 5]);
  });

  it("adds up a menu's quantities when it appears more than once", () => {
    const sales = [
      { menuId: 1, quantity: 3 },
      { menuId: 1, quantity: 3 },
      { menuId: 2, quantity: 5 },
    ];
    expect(popularMenuIds(sales)).toEqual([1, 2]);
  });

  it("takes another top and minimum when given", () => {
    const sales = [
      { menuId: 1, quantity: 2 },
      { menuId: 2, quantity: 3 },
      { menuId: 3, quantity: 1 },
    ];
    expect(popularMenuIds(sales, { top: 1, minSold: 2 })).toEqual([2]);
  });
});

describe("popularSalesRange", () => {
  it("runs from 6 shop days before today to the end of today (7 days)", () => {
    expect(popularSalesRange("2026-10-22")).toEqual({
      start: dayRangeUtc("2026-10-16").start,
      end: dayRangeUtc("2026-10-22").end,
    });
  });

  it("rolls back over a month end", () => {
    expect(popularSalesRange("2026-03-02").start).toEqual(
      dayRangeUtc("2026-02-24").start,
    );
  });
});
