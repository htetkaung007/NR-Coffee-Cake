import { describe, it, expect } from "vitest";
import { findUnpickedRequiredGroup } from "./addonSelection";

const size = { name: "Size", addonIds: [20, 21] };
const milk = { name: "Milk", addonIds: [30, 31] };

describe("findUnpickedRequiredGroup", () => {
  it("returns null when every required group has a pick", () => {
    expect(findUnpickedRequiredGroup([21, 30], [size, milk])).toBeNull();
  });

  it("is satisfied by any one of a group's add-ons", () => {
    expect(findUnpickedRequiredGroup([21], [size])).toBeNull();
  });

  it("returns the required group left without a pick", () => {
    expect(findUnpickedRequiredGroup([20], [size, milk])).toBe(milk);
  });

  it("returns the first unpicked group when several are missing", () => {
    expect(findUnpickedRequiredGroup([], [size, milk])).toBe(size);
  });

  it("does not count an add-on from another group as a pick", () => {
    expect(findUnpickedRequiredGroup([30], [size])).toBe(size);
  });

  it("returns null when the menu has no required groups", () => {
    expect(findUnpickedRequiredGroup([], [])).toBeNull();
  });
});
