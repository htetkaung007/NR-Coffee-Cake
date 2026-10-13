import { describe, it, expect } from "vitest";
import { DEFAULT_LOCALE, LOCALES, isAppLocale, parseLocale } from "./locale";

describe("parseLocale", () => {
  it("keeps a supported locale", () => {
    expect(parseLocale("my")).toBe("my");
    expect(parseLocale("en")).toBe("en");
  });

  it("falls back to Myanmar when the cookie is missing", () => {
    expect(parseLocale(undefined)).toBe("my");
    expect(parseLocale(null)).toBe("my");
    expect(parseLocale("")).toBe("my");
  });

  it("falls back to Myanmar for anything else", () => {
    expect(parseLocale("fr")).toBe("my");
    expect(parseLocale("EN")).toBe("my");
    expect(parseLocale("en-US")).toBe("my");
  });

  it("defaults to Myanmar", () => {
    expect(DEFAULT_LOCALE).toBe("my");
  });
});

describe("isAppLocale", () => {
  it("accepts exactly the supported locales", () => {
    expect(LOCALES.every(isAppLocale)).toBe(true);
    expect(isAppLocale("fr")).toBe(false);
    expect(isAppLocale(1)).toBe(false);
  });
});
