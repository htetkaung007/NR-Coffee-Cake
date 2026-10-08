import { describe, it, expect } from "vitest";
import {
  addonGroupAvailability,
  findAddonSelectionProblem,
  findUnpickedRequiredGroup,
} from "./addonSelection";

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

/** An add-on option as the server loads it. */
const option = (
  id: number,
  name: string,
  overrides: Partial<{ isAvailable: boolean; isArchived: boolean }> = {},
) => ({
  id,
  name,
  isAvailable: overrides.isAvailable ?? true,
  isArchived: overrides.isArchived ?? false,
});

describe("findAddonSelectionProblem", () => {
  const oat = option(30, "Oat milk");
  const soy = option(31, "Soy milk");

  it("accepts available picks that satisfy every required group", () => {
    expect(
      findAddonSelectionProblem([30], [oat], [{ name: "Milk", options: [oat, soy] }]),
    ).toBeNull();
  });

  it("rejects an add-on that is turned off, by name", () => {
    const off = option(30, "Oat milk", { isAvailable: false });
    expect(findAddonSelectionProblem([30], [off], [])).toEqual({
      kind: "unavailable",
      name: "Oat milk",
    });
  });

  it("rejects an archived (deleted) add-on", () => {
    const archived = option(30, "Oat milk", { isArchived: true });
    expect(findAddonSelectionProblem([30], [archived], [])).toEqual({
      kind: "unavailable",
      name: "Oat milk",
    });
  });

  it("rejects an add-on id that doesn't exist, without a name", () => {
    expect(findAddonSelectionProblem([99], [], [])).toEqual({
      kind: "unavailable",
      name: null,
    });
  });

  it("counts only an AVAILABLE option as a pick for a required group", () => {
    const offOat = option(30, "Oat milk", { isAvailable: false });
    const milk = { name: "Milk", options: [offOat, soy] };
    // Soy picked: fine. Nothing usable picked: the group is unpicked.
    expect(findAddonSelectionProblem([31], [soy], [milk])).toBeNull();
    expect(findAddonSelectionProblem([], [], [milk])).toEqual({
      kind: "unpicked",
      groupName: "Milk",
    });
  });

  it("treats a required group whose every option is off as unpicked", () => {
    const milk = {
      name: "Milk",
      options: [option(30, "Oat milk", { isAvailable: false })],
    };
    expect(findAddonSelectionProblem([], [], [milk])).toEqual({
      kind: "unpicked",
      groupName: "Milk",
    });
  });
});

describe("addonGroupAvailability", () => {
  const on = { isAvailable: true };
  const off = { isAvailable: false };

  it("counts the options that are on", () => {
    expect(addonGroupAvailability(true, [on, off, on, on])).toEqual({
      onCount: 3,
      total: 4,
      isBlocked: false,
    });
  });

  it("is blocked when a REQUIRED group has every option off", () => {
    expect(addonGroupAvailability(true, [off, off]).isBlocked).toBe(true);
  });

  it("is never blocked when the group is optional", () => {
    expect(addonGroupAvailability(false, [off, off]).isBlocked).toBe(false);
  });

  it("is blocked when a required group has no options at all", () => {
    expect(addonGroupAvailability(true, [])).toEqual({
      onCount: 0,
      total: 0,
      isBlocked: true,
    });
  });
});
