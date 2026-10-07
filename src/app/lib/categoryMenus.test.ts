import { describe, it, expect } from "vitest";
import {
  categoryPreviewLine,
  groupCategoryMenus,
  planCategoryMenuRemoval,
} from "./categoryMenus";

// Categories: 1 Coffee and 2 Tea are visible here, 3 Seasonal is hidden.
const link = (menuId: number, menuCategoryId: number) => ({
  menuId,
  menuCategoryId,
});

describe("planCategoryMenuRemoval", () => {
  it("removes a menu that is also in another category", () => {
    expect(
      planCategoryMenuRemoval({
        menuCategoryId: 1,
        removeMenuIds: [10],
        links: [link(10, 1), link(10, 2)],
      }),
    ).toEqual({ removeMenuIds: [10], invalidIds: [], orphanedMenuIds: [] });
  });

  it("refuses removing a menu's last category", () => {
    expect(
      planCategoryMenuRemoval({
        menuCategoryId: 1,
        removeMenuIds: [10],
        links: [link(10, 1)],
      }).orphanedMenuIds,
    ).toEqual([10]);
  });

  it("allows it when the menu's only other category is hidden here", () => {
    const plan = planCategoryMenuRemoval({
      menuCategoryId: 1,
      removeMenuIds: [10],
      links: [link(10, 1), link(10, 3)],
    });
    expect(plan.orphanedMenuIds).toEqual([]);
    expect(plan.invalidIds).toEqual([]);
  });

  it("flags a menu that isn't in this category", () => {
    expect(
      planCategoryMenuRemoval({
        menuCategoryId: 1,
        removeMenuIds: [99],
        links: [link(10, 1), link(99, 2)],
      }).invalidIds,
    ).toEqual([99]);
  });

  it("is a no-op for an empty list", () => {
    expect(
      planCategoryMenuRemoval({
        menuCategoryId: 1,
        removeMenuIds: [],
        links: [link(10, 1)],
      }),
    ).toEqual({ removeMenuIds: [], invalidIds: [], orphanedMenuIds: [] });
  });

  it("counts an id sent twice once", () => {
    expect(
      planCategoryMenuRemoval({
        menuCategoryId: 1,
        removeMenuIds: [10, 10],
        links: [link(10, 1), link(10, 2)],
      }).removeMenuIds,
    ).toEqual([10]);
  });
});

describe("groupCategoryMenus", () => {
  const menu = (name: string) => ({ name, assetUrl: null });
  const grouped = groupCategoryMenus({
    links: [
      { ...link(10, 1), menu: menu("Mocha") },
      { ...link(10, 3), menu: menu("Mocha") },
      { ...link(11, 1), menu: menu("Americano") },
      { ...link(11, 2), menu: menu("Americano") },
    ],
    visibleCategoryIds: new Set([1, 2]),
    stockByMenuId: new Map([[11, { quantity: 4, isManuallyDisabled: false }]]),
    hiddenMenuIds: new Set(),
  });

  it("lists each category's menus by name", () => {
    expect(grouped.get(1)!.map((entry) => entry.name)).toEqual([
      "Americano",
      "Mocha",
    ]);
  });

  it("counts other categories, and those visible here", () => {
    const mocha = grouped.get(1)!.find((entry) => entry.id === 10)!;
    expect(mocha.otherCategoryCount).toBe(1);
    expect(mocha.otherVisibleCategoryCount).toBe(0);
  });

  it("uses the Backoffice card status (no stock row = sold out)", () => {
    expect(grouped.get(1)!.find((entry) => entry.id === 10)!.status).toBe(
      "soldOut",
    );
    expect(grouped.get(1)!.find((entry) => entry.id === 11)!.status).toBe(
      "available",
    );
  });
});

describe("categoryPreviewLine", () => {
  const names = (...list: string[]) => list.map((name) => ({ name }));

  it("names up to three menus", () => {
    expect(categoryPreviewLine(names("A", "B"))).toBe("2 items · A, B");
  });

  it("adds +K more past three", () => {
    expect(categoryPreviewLine(names("A", "B", "C", "D", "E"))).toBe(
      "5 items · A, B, C +2 more",
    );
  });

  it("says 1 item in the singular", () => {
    expect(categoryPreviewLine(names("A"))).toBe("1 item · A");
  });
});
