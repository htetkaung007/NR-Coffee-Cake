import { describe, it, expect } from "vitest";
import { hasMissingMyanmarName, hasNoMyanmarName } from "./myanmarNames";

describe("hasNoMyanmarName", () => {
  it("is true for a missing or blank Myanmar name", () => {
    for (const my of [null, undefined, "", "   "]) {
      expect(hasNoMyanmarName(my)).toBe(true);
    }
  });

  it("is false when there is one", () => {
    expect(hasNoMyanmarName("အချို")).toBe(false);
  });
});

describe("hasMissingMyanmarName", () => {
  const named = { name: "Sweet", nameMy: "အချို" };

  it("is false when the group and every option have a Myanmar name", () => {
    expect(hasMissingMyanmarName(named, [{ nameMy: "နည်း" }])).toBe(false);
  });

  it("is true when the group's own Myanmar name is missing", () => {
    expect(
      hasMissingMyanmarName({ name: "Sweet", nameMy: " " }, [{ nameMy: "နည်း" }]),
    ).toBe(true);
  });

  it("is true when any option's Myanmar name is missing", () => {
    expect(
      hasMissingMyanmarName(named, [{ nameMy: "နည်း" }, { nameMy: null }]),
    ).toBe(true);
  });

  it("doesn't count a group with no English name yet", () => {
    expect(hasMissingMyanmarName({ name: "  ", nameMy: null }, [])).toBe(false);
  });
});
