import { describe, it, expect } from "vitest";
import {
  countMenusByStatus,
  filterMenusByStatus,
  parseMenuStatusFilter,
} from "./menuStatusFilter";

const menu = (
  id: number,
  stockQuantity: number,
  isManuallyDisabled = false,
  isHiddenHere = false,
) => ({ id, stockQuantity, isManuallyDisabled, isHiddenHere });

const menus = [
  menu(1, 5),
  menu(2, 0),
  menu(3, 4, true),
  menu(4, 0, true),
  menu(5, 0),
  menu(6, 0, false, true),
];
const ids = (list: { id: number }[]) => list.map((entry) => entry.id);

describe("parseMenuStatusFilter", () => {
  it("accepts the three known values", () => {
    expect(parseMenuStatusFilter("all")).toBe("all");
    expect(parseMenuStatusFilter("soldOut")).toBe("soldOut");
    expect(parseMenuStatusFilter("unavailable")).toBe("unavailable");
  });

  it("reads no value as all", () => {
    expect(parseMenuStatusFilter(undefined)).toBe("all");
  });

  it("reads an unknown value as all", () => {
    expect(parseMenuStatusFilter("hidden")).toBe("all");
    expect(parseMenuStatusFilter("SOLDOUT")).toBe("all");
    expect(parseMenuStatusFilter("")).toBe("all");
  });
});

describe("filterMenusByStatus", () => {
  it("keeps every menu, in order, for all", () => {
    expect(ids(filterMenusByStatus(menus, "all"))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("keeps only the sold-out menus, in their order", () => {
    expect(ids(filterMenusByStatus(menus, "soldOut"))).toEqual([2, 5]);
  });

  it("keeps only the switched-off menus, in their order", () => {
    expect(ids(filterMenusByStatus(menus, "unavailable"))).toEqual([3, 4]);
  });

  it("counts a switched-off menu with no stock as off only", () => {
    expect(ids(filterMenusByStatus([menu(4, 0, true)], "soldOut"))).toEqual([]);
  });

  it("never lists a menu hidden at this location as sold out", () => {
    expect(ids(filterMenusByStatus([menu(6, 0, false, true)], "soldOut"))).toEqual([]);
  });

  it("doesn't change the list it's given", () => {
    const list = [menu(2, 0), menu(1, 5)];
    filterMenusByStatus(list, "soldOut");
    expect(ids(list)).toEqual([2, 1]);
  });
});

describe("countMenusByStatus", () => {
  it("counts all, sold out and off", () => {
    expect(countMenusByStatus(menus)).toEqual({ all: 6, soldOut: 2, unavailable: 2 });
  });

  it("counts zeros for an empty list", () => {
    expect(countMenusByStatus([])).toEqual({ all: 0, soldOut: 0, unavailable: 0 });
  });
});
