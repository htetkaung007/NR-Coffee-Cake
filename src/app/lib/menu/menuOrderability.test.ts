import { describe, it, expect } from "vitest";
import {
  isMenuListed,
  isMenuOrderable,
  notAvailableHereMessage,
  type MenuOrderabilityFacts,
} from "./menuOrderability";

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

describe("isMenuListed (on the menu here at all)", () => {
  it("lists a switched-off menu — it shows as unavailable, not missing", () => {
    const switchedOff = { ...orderable, isManuallyDisabled: true };
    expect(isMenuListed(switchedOff)).toBe(true);
  });

  it("doesn't list a menu hidden at this location", () => {
    expect(isMenuListed({ ...orderable, isDisabledHere: true })).toBe(false);
  });

  it("doesn't list an archived menu, or one with no category visible here", () => {
    expect(isMenuListed({ ...orderable, isArchived: true })).toBe(false);
    expect(isMenuListed({ ...orderable, hasVisibleCategory: false })).toBe(false);
  });

  it("an unlisted menu is never orderable", () => {
    const hidden = { ...orderable, isDisabledHere: true };
    expect(isMenuListed(hidden)).toBe(false);
    expect(isMenuOrderable(hidden)).toBe(false);
  });
});

describe("notAvailableHereMessage", () => {
  it("names the menu", () => {
    expect(notAvailableHereMessage("Iced Latte")).toBe(
      '"Iced Latte" isn\'t available at this location.',
    );
  });
});
