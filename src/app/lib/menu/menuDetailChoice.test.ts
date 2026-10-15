import { describe, it, expect } from "vitest";
import { choiceSummary, missingRequiredGroups } from "./menuDetailChoice";

const SIZE = {
  id: 1,
  name: "Size",
  nameMy: "အရွယ်အစား",
  isRequired: true,
  addons: [
    { id: 10, name: "Small", nameMy: "အသေး" },
    { id: 11, name: "Large", nameMy: null },
  ],
};
const SPICY = {
  id: 2,
  name: "Spicy level",
  isRequired: true,
  addons: [{ id: 20, name: "Mild" }],
};
const TOPPINGS = {
  id: 3,
  name: "Toppings",
  isRequired: false,
  addons: [
    { id: 30, name: "Pearl" },
    { id: 31, name: "Jelly" },
  ],
};
const GROUPS = [SIZE, SPICY, TOPPINGS];

describe("missingRequiredGroups", () => {
  it("lists every required group with nothing picked, in order", () => {
    expect(missingRequiredGroups(GROUPS, {}).map((g) => g.id)).toEqual([1, 2]);
  });

  it("drops a required group once something in it is picked", () => {
    expect(missingRequiredGroups(GROUPS, { 1: [11] }).map((g) => g.id)).toEqual(
      [2],
    );
  });

  it("never lists an optional group, and an emptied pick counts as none", () => {
    expect(
      missingRequiredGroups(GROUPS, { 1: [10], 2: [], 3: [] }).map((g) => g.id),
    ).toEqual([2]);
  });

  it("is empty when every required group has a pick", () => {
    expect(missingRequiredGroups(GROUPS, { 1: [10], 2: [20] })).toEqual([]);
  });
});

describe("choiceSummary", () => {
  it("joins the picks in group order, then option order", () => {
    expect(choiceSummary("en", GROUPS, { 3: [31, 30], 1: [11] })).toBe(
      "Large · Pearl · Jelly",
    );
  });

  it("uses the Myanmar names when chosen, English where there is none", () => {
    expect(choiceSummary("my", GROUPS, { 1: [10], 3: [30] })).toBe(
      "အသေး · Pearl",
    );
  });

  it("is empty with nothing picked", () => {
    expect(choiceSummary("en", GROUPS, {})).toBe("");
  });
});
