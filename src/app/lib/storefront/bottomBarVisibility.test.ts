import { describe, it, expect } from "vitest";
import {
  bottomBarHref,
  bottomBarTab,
  idFromParam,
  isBottomBarVisible,
} from "./bottomBarVisibility";

const SHOWN = { hiddenByScreen: false };

describe("isBottomBarVisible", () => {
  it("shows on the menu, cart, history and an order's receipt", () => {
    for (const path of ["/menu", "/cart", "/history", "/history/42"]) {
      expect(isBottomBarVisible(path, SHOWN)).toBe(true);
    }
  });

  it("hides on the scan / continue screens and other paths", () => {
    for (const path of [
      "/counter/continue",
      "/counter",
      "/table",
      "/language",
      "/",
      "/menus",
    ]) {
      expect(isBottomBarVisible(path, SHOWN)).toBe(false);
    }
  });

  it("hides while the page shows a full-screen state of its own", () => {
    expect(isBottomBarVisible("/cart", { hiddenByScreen: true })).toBe(false);
  });
});

describe("bottomBarTab", () => {
  it("marks History on an order's receipt too", () => {
    expect(bottomBarTab("/history/42")).toBe("history");
  });
});

describe("bottomBarHref", () => {
  it("keeps the location", () => {
    expect(bottomBarHref("cart", { locationId: 3, tableId: null })).toBe(
      "/cart?locationId=3",
    );
  });

  it("keeps the table on a Table QR's pages", () => {
    expect(bottomBarHref("history", { locationId: 3, tableId: 7 })).toBe(
      "/history?locationId=3&tableId=7",
    );
  });

  it("is the bare path when no location is known", () => {
    expect(bottomBarHref("menu", { locationId: null, tableId: 7 })).toBe(
      "/menu",
    );
  });
});

describe("idFromParam", () => {
  it("reads a positive whole number", () => {
    expect(idFromParam("12")).toBe(12);
  });

  it("refuses anything else", () => {
    for (const value of [null, "", "0", "-1", "1.5", "abc", "1e3"]) {
      expect(idFromParam(value)).toBeNull();
    }
  });
});
