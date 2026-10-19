import { describe, it, expect } from "vitest";
import { redirectTo, relativePath } from "./redirect";

describe("relativePath", () => {
  it("keeps the path and the query, with no host", () => {
    expect(relativePath("/menu", { locationId: 1, tableId: 5 })).toBe(
      "/menu?locationId=1&tableId=5",
    );
  });

  it("leaves out empty, null and undefined values", () => {
    expect(
      relativePath("/menu", { locationId: 2, tableId: null, notice: undefined, x: "" }),
    ).toBe("/menu?locationId=2");
  });

  it("is the bare path without a query", () => {
    expect(relativePath("/counter/continue")).toBe("/counter/continue");
  });

  it("encodes query values", () => {
    expect(relativePath("/auth/signIn", { callbackUrl: "/backoffice/order?tab=open" })).toBe(
      "/auth/signIn?callbackUrl=%2Fbackoffice%2Forder%3Ftab%3Dopen",
    );
  });

  it("refuses anything that isn't an app path", () => {
    expect(() => relativePath("https://evil.example/menu")).toThrow();
    expect(() => relativePath("//evil.example/menu")).toThrow();
    expect(() => relativePath("menu")).toThrow();
  });
});

describe("redirectTo", () => {
  it("sends a relative Location — the browser keeps its own host", () => {
    const response = redirectTo("/menu?locationId=1");
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("/menu?locationId=1");
  });

  it("can answer 303", () => {
    expect(redirectTo("/menu", 303).status).toBe(303);
  });

  it("keeps cookies set on the response", () => {
    const response = redirectTo("/menu");
    response.cookies.set("a", "1", { path: "/" });
    expect(response.headers.get("set-cookie")).toContain("a=1");
  });

  it("refuses an absolute URL", () => {
    expect(() => redirectTo("http://localhost:3000/menu")).toThrow();
  });
});
