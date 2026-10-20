import { describe, it, expect } from "vitest";
import { parseStoredLanguage } from "./staffMenuLanguage";

describe("parseStoredLanguage", () => {
  it("reads a stored Myanmar choice", () => {
    expect(parseStoredLanguage("my")).toBe("my");
  });

  it("keeps a stored English choice, whatever the staff's language", () => {
    expect(parseStoredLanguage("en", "my")).toBe("en");
  });

  it("follows the staff's Backoffice language until the device has its own choice", () => {
    for (const raw of [null, "", "MY", "burmese"]) {
      expect(parseStoredLanguage(raw, "my")).toBe("my");
    }
  });

  it("is English when nothing or anything else is stored", () => {
    for (const raw of [null, "", "en", "MY", "burmese"]) {
      expect(parseStoredLanguage(raw)).toBe("en");
    }
  });
});
