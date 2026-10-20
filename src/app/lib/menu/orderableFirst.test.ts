import { describe, it, expect } from "vitest";
import { isOrderableOnCard, orderableFirst } from "./orderableFirst";

const menu = (id: number, stockQuantity: number, isAvailable = true, category = "Coffee") => ({
  id,
  stockQuantity,
  isAvailable,
  category,
});
const ids = (menus: { id: number }[]) => menus.map((entry) => entry.id);

describe("isOrderableOnCard", () => {
  it("needs stock left AND the switch on", () => {
    expect(isOrderableOnCard(menu(1, 3))).toBe(true);
    expect(isOrderableOnCard(menu(2, 0))).toBe(false);
    expect(isOrderableOnCard(menu(3, -1))).toBe(false);
    expect(isOrderableOnCard(menu(4, 3, false))).toBe(false);
  });
});

describe("orderableFirst", () => {
  it("puts sold-out and switched-off menus after the orderable ones", () => {
    const list = [menu(1, 0), menu(2, 5), menu(3, 2, false), menu(4, 1)];
    expect(ids(orderableFirst(list))).toEqual([2, 4, 1, 3]);
  });

  it("keeps each group in the order it came in (stable)", () => {
    const list = [menu(5, 0), menu(1, 2), menu(4, 0), menu(2, 2), menu(3, 0, false)];
    expect(ids(orderableFirst(list))).toEqual([1, 2, 5, 4, 3]);
  });

  it("leaves an all-orderable list as it is", () => {
    const list = [menu(3, 1), menu(1, 9), menu(2, 4)];
    expect(ids(orderableFirst(list))).toEqual([3, 1, 2]);
  });

  it("leaves a list with nothing orderable as it is", () => {
    const list = [menu(3, 0), menu(1, 5, false), menu(2, 0)];
    expect(ids(orderableFirst(list))).toEqual([3, 1, 2]);
  });

  it("orders only what the category / search filter kept", () => {
    const list = [menu(1, 0, true, "Tea"), menu(2, 0), menu(3, 4, true, "Tea"), menu(4, 2)];
    const tea = list.filter((entry) => entry.category === "Tea");
    expect(ids(orderableFirst(tea))).toEqual([3, 1]);
  });

  it("doesn't change the list it's given", () => {
    const list = [menu(1, 0), menu(2, 5)];
    orderableFirst(list);
    expect(ids(list)).toEqual([1, 2]);
  });
});
