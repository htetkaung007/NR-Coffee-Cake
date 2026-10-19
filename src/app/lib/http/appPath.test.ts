import { describe, it, expect } from "vitest";
import { isAppPath } from "./appPath";

describe("isAppPath", () => {
  it("accepts an in-app path with a query", () => {
    expect(isAppPath("/backoffice/order?tab=open")).toBe(true);
  });

  it("refuses full URLs, protocol-relative and backslash tricks", () => {
    expect(isAppPath("http://localhost:3000/backoffice")).toBe(false);
    expect(isAppPath("//evil.example")).toBe(false);
    expect(isAppPath("/\\evil.example")).toBe(false);
  });

  it("refuses empty and missing values", () => {
    expect(isAppPath("")).toBe(false);
    expect(isAppPath(null)).toBe(false);
    expect(isAppPath(undefined)).toBe(false);
  });
});
