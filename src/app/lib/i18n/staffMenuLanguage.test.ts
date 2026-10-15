import { describe, it, expect } from "vitest";
import { parseStaffMenuLanguage } from "./staffMenuLanguage";

describe("parseStaffMenuLanguage", () => {
  it("reads a stored Myanmar choice", () => {
    expect(parseStaffMenuLanguage("my")).toBe("my");
  });

  it("is English when nothing or anything else is stored", () => {
    for (const raw of [null, "", "en", "MY", "burmese"]) {
      expect(parseStaffMenuLanguage(raw)).toBe("en");
    }
  });
});
