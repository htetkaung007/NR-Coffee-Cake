import { describe, it, expect } from "vitest";
import { isSidebarRail, parseSidebarPreference } from "./backofficeSidebar";

describe("parseSidebarPreference", () => {
  it("keeps collapsed and expanded", () => {
    expect(parseSidebarPreference("collapsed")).toBe("collapsed");
    expect(parseSidebarPreference("expanded")).toBe("expanded");
  });

  it("treats anything else as not chosen", () => {
    for (const value of [null, undefined, "", "open", "Collapsed"]) {
      expect(parseSidebarPreference(value)).toBeNull();
    }
  });
});

describe("isSidebarRail", () => {
  it("never shows the rail off a touch tablet, whatever was chosen", () => {
    for (const preference of [null, "collapsed", "expanded"] as const) {
      expect(
        isSidebarRail({ preference, isTouchTablet: false, isPortrait: true }),
      ).toBe(false);
    }
  });

  it("defaults to the rail in portrait and the full sidebar in landscape", () => {
    expect(
      isSidebarRail({ preference: null, isTouchTablet: true, isPortrait: true }),
    ).toBe(true);
    expect(
      isSidebarRail({ preference: null, isTouchTablet: true, isPortrait: false }),
    ).toBe(false);
  });

  it("follows the user's choice in either orientation", () => {
    for (const isPortrait of [true, false]) {
      expect(
        isSidebarRail({ preference: "collapsed", isTouchTablet: true, isPortrait }),
      ).toBe(true);
      expect(
        isSidebarRail({ preference: "expanded", isTouchTablet: true, isPortrait }),
      ).toBe(false);
    }
  });
});
