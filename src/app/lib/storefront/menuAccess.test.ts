import { describe, it, expect } from "vitest";
import { menuAccess, parseIdParam } from "./menuAccess";

const open = { locationExists: true, isArchived: false };

describe("menuAccess", () => {
  it("shows the menu to a visitor with a QR session, online menu on", () => {
    expect(menuAccess({ ...open, hasQrSession: true, onlineMenuEnabled: true })).toBe("menu");
  });

  it("shows the menu to a visitor with a QR session even when the online menu is off", () => {
    expect(menuAccess({ ...open, hasQrSession: true, onlineMenuEnabled: false })).toBe("menu");
  });

  it("shows the menu to anyone when the online menu is on", () => {
    expect(menuAccess({ ...open, hasQrSession: false, onlineMenuEnabled: true })).toBe("menu");
  });

  it("is unavailable without a QR session when the online menu is off", () => {
    expect(menuAccess({ ...open, hasQrSession: false, onlineMenuEnabled: false })).toBe(
      "unavailable",
    );
  });

  it("is unavailable for a location that doesn't exist, whatever else", () => {
    expect(
      menuAccess({
        locationExists: false,
        isArchived: false,
        hasQrSession: true,
        onlineMenuEnabled: true,
      }),
    ).toBe("unavailable");
  });

  it("is unavailable for an archived location, even with a QR session and the online menu on", () => {
    expect(
      menuAccess({
        locationExists: true,
        isArchived: true,
        hasQrSession: true,
        onlineMenuEnabled: true,
      }),
    ).toBe("unavailable");
  });
});

describe("parseIdParam", () => {
  it("reads a positive whole number", () => {
    expect(parseIdParam("7")).toBe(7);
  });

  it("refuses a missing or blank value", () => {
    expect(parseIdParam(undefined)).toBeNull();
    expect(parseIdParam(null)).toBeNull();
    expect(parseIdParam(" ")).toBeNull();
  });

  it("refuses zero, negatives, fractions and words", () => {
    expect(parseIdParam("0")).toBeNull();
    expect(parseIdParam("-3")).toBeNull();
    expect(parseIdParam("1.5")).toBeNull();
    expect(parseIdParam("abc")).toBeNull();
  });
});
