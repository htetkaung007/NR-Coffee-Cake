import { describe, it, expect } from "vitest";
import { matchesMenuSearch } from "./menuSearch";

const latte = { name: "Iced Latte", nameMy: "လာတေး အေး" };

describe("matchesMenuSearch", () => {
  it("matches everything when the search is empty or spaces", () => {
    expect(matchesMenuSearch(latte, "")).toBe(true);
    expect(matchesMenuSearch(latte, "   ")).toBe(true);
  });

  it("matches the English name, ignoring case", () => {
    expect(matchesMenuSearch(latte, "LATTE")).toBe(true);
  });

  it("matches the Myanmar name too, whatever language is chosen", () => {
    expect(matchesMenuSearch(latte, "လာတေး")).toBe(true);
  });

  it("trims the search", () => {
    expect(matchesMenuSearch(latte, "  iced ")).toBe(true);
  });

  it("doesn't match a menu with neither name containing it", () => {
    expect(matchesMenuSearch(latte, "mocha")).toBe(false);
  });

  it("works for a menu with no Myanmar name", () => {
    expect(matchesMenuSearch({ name: "Mocha", nameMy: null }, "moc")).toBe(true);
  });
});
