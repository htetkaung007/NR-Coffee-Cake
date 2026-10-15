import { describe, it, expect } from "vitest";
import { myanmarNameCount, myanmarPlaceholder } from "./addonOptionNames";

describe("myanmarNameCount", () => {
  it("counts only rows with an English name (the ones that are saved)", () => {
    expect(
      myanmarNameCount([
        { name: "Oat milk", nameMy: "" },
        { name: "", nameMy: "ဆီ" },
        { name: "  ", nameMy: "" },
      ]),
    ).toEqual({ named: 0, total: 1 });
  });

  it("treats a blank Myanmar name as none", () => {
    expect(
      myanmarNameCount([
        { name: "Oat milk", nameMy: "  " },
        { name: "Soy milk", nameMy: "ပဲနို့" },
      ]),
    ).toEqual({ named: 1, total: 2 });
  });

  it("is 0 of 0 with no named rows", () => {
    expect(myanmarNameCount([])).toEqual({ named: 0, total: 0 });
  });
});

describe("myanmarPlaceholder", () => {
  it("names the English fallback once there is an English name", () => {
    expect(myanmarPlaceholder(" Oat milk ")).toBe("Oat milk (shown if empty)");
  });

  it("asks for a Myanmar name while the English one is blank", () => {
    expect(myanmarPlaceholder("  ")).toBe("Myanmar name");
  });
});
