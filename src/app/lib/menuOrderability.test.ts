import { describe, it, expect } from "vitest";
import { isMenuOrderable, type MenuOrderabilityFacts } from "./menuOrderability";

/** A menu that can be ordered; each test spoils exactly one thing. */
const orderable: MenuOrderabilityFacts = {
  isArchived: false,
  isManuallyDisabled: false,
  isDisabledHere: false,
  hasVisibleCategory: true,
};

describe("isMenuOrderable", () => {
  it("is true for a live menu that nothing blocks", () => {
    expect(isMenuOrderable(orderable)).toBe(true);
  });

  it("is false for an archived menu", () => {
    expect(isMenuOrderable({ ...orderable, isArchived: true })).toBe(false);
  });

  it("is false when staff switched the menu off in its stock row", () => {
    expect(isMenuOrderable({ ...orderable, isManuallyDisabled: true })).toBe(false);
  });

  it("is false when the menu is disabled at this location", () => {
    expect(isMenuOrderable({ ...orderable, isDisabledHere: true })).toBe(false);
  });

  it("is false when none of the menu's categories is visible here", () => {
    expect(isMenuOrderable({ ...orderable, hasVisibleCategory: false })).toBe(false);
  });
});
