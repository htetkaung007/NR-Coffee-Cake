import { describe, it, expect } from "vitest";
import en from "../../../../messages/en.json";
import my from "../../../../messages/my.json";

/** Every key path in a messages object ("cart.sendOrder"), sorted. */
function keyPaths(messages: object, prefix = ""): string[] {
  return Object.entries(messages)
    .flatMap(([key, value]) =>
      typeof value === "object" && value !== null
        ? keyPaths(value, `${prefix}${key}.`)
        : [`${prefix}${key}`],
    )
    .sort();
}

describe("customer messages", () => {
  it("has exactly the same keys in Myanmar and English", () => {
    expect(keyPaths(my)).toEqual(keyPaths(en));
  });

  it("has no empty message in either language", () => {
    const empty = (messages: object) =>
      keyPaths(messages).filter((path) => {
        const value = path
          .split(".")
          .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], messages);
        return typeof value !== "string" || value.trim() === "";
      });
    expect(empty(en)).toEqual([]);
    expect(empty(my)).toEqual([]);
  });

  it("uses the same {placeholders} in both languages", () => {
    // The argument names: "{name}" and ICU ones ("{count, plural, …}").
    const placeholders = (text: string) =>
      [...new Set([...text.matchAll(/\{(\w+)[,}]/g)].map((match) => match[1]))].sort();
    const valueAt = (messages: object, path: string) =>
      path
        .split(".")
        .reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], messages) as string;
    for (const path of keyPaths(en)) {
      expect(placeholders(valueAt(my, path)), path).toEqual(
        placeholders(valueAt(en, path)),
      );
    }
  });
});
