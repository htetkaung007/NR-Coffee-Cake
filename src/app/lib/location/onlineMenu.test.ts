import { describe, it, expect } from "vitest";
import { onlineMenuLink } from "./onlineMenu";

describe("onlineMenuLink", () => {
  it("is the full menu URL when a public base URL is set", () => {
    expect(onlineMenuLink(7, "https://menu.example.com")).toBe(
      "https://menu.example.com/menu?locationId=7",
    );
  });

  it("ignores a trailing slash on the base", () => {
    expect(onlineMenuLink(7, "https://menu.example.com/")).toBe(
      "https://menu.example.com/menu?locationId=7",
    );
  });

  it("is the path only when no base URL is set", () => {
    expect(onlineMenuLink(7, "")).toBe("/menu?locationId=7");
  });
});
