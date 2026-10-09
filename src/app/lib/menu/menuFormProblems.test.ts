import { describe, it, expect } from "vitest";
import { menuFormProblems } from "./menuFormProblems";
import {
  MENU_CATEGORY_REQUIRED_MESSAGE,
  MENU_NAME_REQUIRED_MESSAGE,
  MENU_PRICE_POSITIVE_MESSAGE,
  MENU_PRICE_WHOLE_MESSAGE,
} from "../schemas/menu_menuCategorySchema";
import { NO_LOCATION_MESSAGE } from "./menuLocations";

/** A form that passes every rule; each test spoils one thing. */
const valid = {
  name: "Iced Latte",
  price: "3500",
  categoryIds: [1],
  requiresLocation: true,
  shownLocationIds: [10],
};

describe("menuFormProblems", () => {
  it("finds nothing wrong with a complete form", () => {
    expect(menuFormProblems(valid)).toEqual([]);
  });

  it("needs a name that isn't only spaces", () => {
    expect(menuFormProblems({ ...valid, name: "   " })).toEqual([
      { field: "name", message: MENU_NAME_REQUIRED_MESSAGE },
    ]);
  });

  it("needs a price above zero (an empty price counts as zero)", () => {
    for (const price of ["", "0", "-5"]) {
      expect(menuFormProblems({ ...valid, price })).toEqual([
        { field: "price", message: MENU_PRICE_POSITIVE_MESSAGE },
      ]);
    }
  });

  it("needs a whole-number price", () => {
    expect(menuFormProblems({ ...valid, price: "12.5" })).toEqual([
      { field: "price", message: MENU_PRICE_WHOLE_MESSAGE },
    ]);
  });

  it("refuses a price that isn't a number", () => {
    expect(menuFormProblems({ ...valid, price: "abc" })[0].field).toBe("price");
  });

  it("needs at least one category", () => {
    expect(menuFormProblems({ ...valid, categoryIds: [] })).toEqual([
      { field: "categories", message: MENU_CATEGORY_REQUIRED_MESSAGE },
    ]);
  });

  it("needs a location when the form shows the location checklist", () => {
    expect(menuFormProblems({ ...valid, shownLocationIds: [] })).toEqual([
      { field: "locations", message: NO_LOCATION_MESSAGE },
    ]);
  });

  it("doesn't ask for a location when there is no checklist", () => {
    expect(
      menuFormProblems({ ...valid, requiresLocation: false, shownLocationIds: [] }),
    ).toEqual([]);
  });

  it("lists every problem in on-screen order", () => {
    expect(
      menuFormProblems({
        name: "",
        price: "",
        categoryIds: [],
        requiresLocation: true,
        shownLocationIds: [],
      }).map((problem) => problem.field),
    ).toEqual(["name", "price", "categories", "locations"]);
  });
});
