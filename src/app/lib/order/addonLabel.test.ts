import { describe, it, expect } from "vitest";
import { formatAddonSelections, localizeAddonSelections } from "./addonLabel";

describe("formatAddonSelections", () => {
  it("puts each option after its group's name", () => {
    expect(
      formatAddonSelections([
        { name: "Hot", groupName: "Temperature" },
        { name: "Low", groupName: "Sweet" },
      ]),
    ).toBe("Temperature: Hot · Sweet: Low");
  });

  it("lists a group's options together, in the order given", () => {
    expect(
      formatAddonSelections([
        { name: "Pearl", groupName: "Toppings" },
        { name: "Low", groupName: "Sweet" },
        { name: "Jelly", groupName: "Toppings" },
      ]),
    ).toBe("Toppings: Pearl, Jelly · Sweet: Low");
  });

  it("tells apart two groups that share an option name", () => {
    expect(
      formatAddonSelections([
        { name: "Low", groupName: "Sweet" },
        { name: "Low", groupName: "Ice" },
      ]),
    ).toBe("Sweet: Low · Ice: Low");
  });

  it("shows just the option name when its group name is missing", () => {
    expect(
      formatAddonSelections([
        { name: "Extra shot" },
        { name: "Hot", groupName: "Temperature" },
        { name: "Oat milk", groupName: null },
        { name: "Cream", groupName: "  " },
      ]),
    ).toBe("Extra shot · Temperature: Hot · Oat milk · Cream");
  });

  it("is empty with no add-ons", () => {
    expect(formatAddonSelections([])).toBe("");
  });
});

describe("localizeAddonSelections", () => {
  it("uses the Myanmar group and option names when chosen and given", () => {
    expect(
      localizeAddonSelections("my", [
        {
          name: "Low",
          nameMy: "နည်း",
          groupName: "Sweet",
          groupNameMy: "အချို",
        },
      ]),
    ).toEqual([{ name: "နည်း", groupName: "အချို" }]);
  });

  it("falls back to English for a missing Myanmar name, and keeps English in English", () => {
    const addon = {
      name: "Low",
      nameMy: null,
      groupName: "Sweet",
      groupNameMy: "အချို",
    };
    expect(localizeAddonSelections("my", [addon])).toEqual([
      { name: "Low", groupName: "အချို" },
    ]);
    expect(localizeAddonSelections("en", [addon])).toEqual([
      { name: "Low", groupName: "Sweet" },
    ]);
  });

  it("leaves the group out when there is none", () => {
    expect(localizeAddonSelections("my", [{ name: "Low" }])).toEqual([
      { name: "Low", groupName: null },
    ]);
  });
});
