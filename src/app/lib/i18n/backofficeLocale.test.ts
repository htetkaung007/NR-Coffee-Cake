import { describe, it, expect } from "vitest";
import {
  BACKOFFICE_LOCALE_COOKIE,
  localeForSurface,
  parseAppSurface,
  parseBackofficeLocale,
  surfaceForPath,
} from "./backofficeLocale";
import { LOCALE_COOKIE } from "./locale";

describe("parseBackofficeLocale", () => {
  it("defaults to English when no cookie is set", () => {
    expect(parseBackofficeLocale(undefined)).toBe("en");
    expect(parseBackofficeLocale(null)).toBe("en");
    expect(parseBackofficeLocale("")).toBe("en");
  });

  it("reads Myanmar only when the cookie says exactly my", () => {
    expect(parseBackofficeLocale("my")).toBe("my");
    expect(parseBackofficeLocale("en")).toBe("en");
  });

  it("treats anything else as English", () => {
    expect(parseBackofficeLocale("MY")).toBe("en");
    expect(parseBackofficeLocale("fr")).toBe("en");
    expect(parseBackofficeLocale(" my")).toBe("en");
  });
});

describe("surfaceForPath", () => {
  it("puts the Backoffice, /print and the sign-in pages on the staff surface", () => {
    expect(surfaceForPath("/backoffice")).toBe("staff");
    expect(surfaceForPath("/backoffice/order/new")).toBe("staff");
    expect(surfaceForPath("/print/bill/12")).toBe("staff");
    expect(surfaceForPath("/auth/signIn")).toBe("staff");
  });

  it("leaves customer pages on the storefront", () => {
    expect(surfaceForPath("/")).toBe("storefront");
    expect(surfaceForPath("/menu")).toBe("storefront");
    expect(surfaceForPath("/history/4")).toBe("storefront");
  });

  it("never matches a path that only starts with the same letters", () => {
    expect(surfaceForPath("/backofficex")).toBe("storefront");
    expect(surfaceForPath("/printer")).toBe("storefront");
    expect(surfaceForPath("/authors")).toBe("storefront");
  });
});

describe("parseAppSurface", () => {
  it("is staff only for the exact header value", () => {
    expect(parseAppSurface("staff")).toBe("staff");
    expect(parseAppSurface("Staff")).toBe("storefront");
    expect(parseAppSurface(null)).toBe("storefront");
    expect(parseAppSurface(undefined)).toBe("storefront");
  });
});

describe("localeForSurface", () => {
  const cookies =
    (values: Record<string, string>) => (name: string) => values[name];

  it("reads BO_LOCALE on the staff surface, ignoring the customer's cookie", () => {
    const read = cookies({ [BACKOFFICE_LOCALE_COOKIE]: "my", [LOCALE_COOKIE]: "en" });
    expect(localeForSurface("staff", read)).toBe("my");
  });

  it("reads NEXT_LOCALE on the storefront, ignoring the staff cookie", () => {
    const read = cookies({ [BACKOFFICE_LOCALE_COOKIE]: "my", [LOCALE_COOKIE]: "en" });
    expect(localeForSurface("storefront", read)).toBe("en");
  });

  it("keeps each surface's own default when its cookie is missing", () => {
    const read = cookies({});
    expect(localeForSurface("staff", read)).toBe("en");
    expect(localeForSurface("storefront", read)).toBe("my");
  });
});
