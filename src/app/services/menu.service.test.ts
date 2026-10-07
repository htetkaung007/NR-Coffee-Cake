import { describe, it, expect, vi } from "vitest";

// listMenusAtLocation is pure, but its module imports the Prisma client
// — stubbed so these tests never create one (menuCategory.service.test.ts).
vi.mock("@/app/utils/prisma", () => ({ prisma: {} }));

import { listMenusAtLocation } from "./menu.service";

const coffee = { id: 5, name: "Coffee" };
const tea = { id: 6, name: "Tea" };
const hiddenCategory = { id: 7, name: "Seasonal" };

/** A menu as getMenusWithDetails returns it (only what the list reads). */
function menu(id: number, overrides: Partial<{ isHiddenHere: boolean; isManuallyDisabled: boolean; stockQuantity: number; categoryRefs: { id: number; name: string }[] }> = {}) {
  return {
    id,
    isHiddenHere: false,
    isManuallyDisabled: false,
    stockQuantity: 5,
    categoryRefs: [coffee],
    ...overrides,
  };
}

describe("listMenusAtLocation (what customers and the staff POS see)", () => {
  it("leaves out a menu hidden at this location", () => {
    const { menus } = listMenusAtLocation(
      [menu(1), menu(2, { isHiddenHere: true })],
      [coffee],
    );
    expect(menus.map((entry) => entry.id)).toEqual([1]);
  });

  it("keeps a switched-off or stock-0 menu, so it shows as sold out / unavailable", () => {
    const { menus } = listMenusAtLocation(
      [menu(1, { isManuallyDisabled: true }), menu(2, { stockQuantity: 0 })],
      [coffee],
    );
    expect(menus.map((entry) => entry.id)).toEqual([1, 2]);
  });

  it("leaves out a menu whose categories are all hidden here", () => {
    const { menus } = listMenusAtLocation(
      [menu(1, { categoryRefs: [hiddenCategory] })],
      [coffee],
    );
    expect(menus).toEqual([]);
  });

  it("drops a category tab that only held hidden menus", () => {
    const { categories } = listMenusAtLocation(
      [menu(1), menu(2, { isHiddenHere: true, categoryRefs: [tea] })],
      [coffee, tea],
    );
    expect(categories).toEqual([coffee]);
  });

  it("orders menus by their first visible category, then id", () => {
    const { menus } = listMenusAtLocation(
      [menu(3, { categoryRefs: [tea] }), menu(2), menu(1, { categoryRefs: [tea] })],
      [coffee, tea],
    );
    expect(menus.map((entry) => entry.id)).toEqual([2, 1, 3]);
  });
});
