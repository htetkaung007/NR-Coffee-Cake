import { describe, it, expect } from "vitest";
import { lineMergeKey } from "./orderLineMerge";

const extraShot = { addonId: 1, unitPrice: 500 };
const oatMilk = { addonId: 2, unitPrice: 700 };

describe("lineMergeKey", () => {
  it("treats the same add-ons picked in a different order as the same line", () => {
    expect(lineMergeKey(10, 2000, [extraShot, oatMilk], null)).toBe(
      lineMergeKey(10, 2000, [oatMilk, extraShot], null),
    );
  });

  it("counts a duplicated add-on the same as picking it once", () => {
    expect(lineMergeKey(10, 2000, [extraShot, extraShot], null)).toBe(
      lineMergeKey(10, 2000, [extraShot], null),
    );
  });

  it("ignores letter case and repeated spaces in the note", () => {
    expect(lineMergeKey(10, 2000, [], "Extra hot")).toBe(
      lineMergeKey(10, 2000, [], "extra  hot"),
    );
  });

  it("treats a null, empty or whitespace-only note as no note", () => {
    const noNote = lineMergeKey(10, 2000, [], null);
    expect(lineMergeKey(10, 2000, [], "")).toBe(noNote);
    expect(lineMergeKey(10, 2000, [], "   ")).toBe(noNote);
    expect(lineMergeKey(10, 2000, [], undefined)).toBe(noNote);
  });

  it("keeps notes with different words apart", () => {
    expect(lineMergeKey(10, 2000, [], "less sugar")).not.toBe(
      lineMergeKey(10, 2000, [], "no sugar"),
    );
  });

  it("keeps a line with a note apart from one without", () => {
    expect(lineMergeKey(10, 2000, [], "less sugar")).not.toBe(
      lineMergeKey(10, 2000, [], null),
    );
  });

  it("keeps the same menu at different unit prices apart", () => {
    expect(lineMergeKey(10, 2000, [], null)).not.toBe(
      lineMergeKey(10, 2500, [], null),
    );
  });

  it("keeps the same add-on at different unit prices apart", () => {
    expect(lineMergeKey(10, 2000, [extraShot], null)).not.toBe(
      lineMergeKey(10, 2000, [{ addonId: 1, unitPrice: 600 }], null),
    );
  });

  it("keeps different add-on sets apart", () => {
    expect(lineMergeKey(10, 2000, [extraShot], null)).not.toBe(
      lineMergeKey(10, 2000, [extraShot, oatMilk], null),
    );
  });

  it("keeps different menus apart", () => {
    expect(lineMergeKey(10, 2000, [], null)).not.toBe(
      lineMergeKey(11, 2000, [], null),
    );
  });
});
