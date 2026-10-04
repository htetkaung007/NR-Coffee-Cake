import { describe, it, expect } from "vitest";
import { isPlainLeftClick } from "./isPlainLeftClick";

const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };

describe("isPlainLeftClick", () => {
  it("is true for an ordinary left click", () => {
    expect(isPlainLeftClick(click)).toBe(true);
  });

  it("is false for the middle or right button", () => {
    expect(isPlainLeftClick({ ...click, button: 1 })).toBe(false);
    expect(isPlainLeftClick({ ...click, button: 2 })).toBe(false);
  });

  it.each(["metaKey", "ctrlKey", "shiftKey", "altKey"] as const)(
    "is false when %s is held (open in a new tab / window)",
    (modifier) => {
      expect(isPlainLeftClick({ ...click, [modifier]: true })).toBe(false);
    },
  );
});
