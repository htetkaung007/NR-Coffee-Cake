import { describe, it, expect } from "vitest";
import { companyNameSchema } from "./companyNameSchema";

const parse = (value: unknown) => companyNameSchema.safeParse(value);
const errorOf = (value: unknown) => {
  const result = parse(value);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("companyNameSchema", () => {
  it("trims leading and trailing whitespace", () => {
    expect(parse("  Café Maw  ").data).toBe("Café Maw");
  });

  it("collapses inner runs of whitespace to one space", () => {
    expect(parse("Café \t  Maw\n Yangon").data).toBe("Café Maw Yangon");
  });

  it("rejects an empty name", () => {
    expect(errorOf("")).toBe("Company name is required.");
  });

  it("rejects a whitespace-only name", () => {
    expect(errorOf("   \t\n ")).toBe("Company name is required.");
  });

  it("accepts exactly 60 characters", () => {
    expect(parse("a".repeat(60)).success).toBe(true);
  });

  it("rejects 61 characters", () => {
    expect(errorOf("a".repeat(61))).toBe("Company name is too long.");
  });

  it("measures the length after normalising, not before", () => {
    const padded = `  ${"a".repeat(30)}     ${"b".repeat(29)}  `;
    expect(parse(padded).data).toBe(`${"a".repeat(30)} ${"b".repeat(29)}`);
  });

  it("accepts Myanmar text", () => {
    expect(parse("ကော်ဖီ ဆိုင်").data).toBe("ကော်ဖီ ဆိုင်");
  });

  it("accepts punctuation", () => {
    expect(parse("NR Coffee & Cake (Café) — Ltd.").success).toBe(true);
  });
});
