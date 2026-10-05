import { describe, it, expect } from "vitest";
import { rejectRoundSchema } from "./rejectRoundSchema";

const parse = (input: Record<string, unknown>) =>
  rejectRoundSchema.safeParse({ sessionId: 7, ...input });
const errorOf = (input: Record<string, unknown>) => {
  const result = parse(input);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("rejectRoundSchema — note", () => {
  it("keeps a note on Other, trimmed", () => {
    const result = parse({ rejectReason: "OTHER", note: "  coffee machine broken  " });
    expect(result.data).toEqual({
      sessionId: 7,
      details: { rejectReason: "OTHER", note: "coffee machine broken" },
    });
  });

  it("collapses inner whitespace runs to one space", () => {
    expect(parse({ rejectReason: "OTHER", note: "coffee   \t machine" }).data?.details).toEqual({
      rejectReason: "OTHER",
      note: "coffee machine",
    });
  });

  it("turns a newline inside the note into a space", () => {
    expect(parse({ rejectReason: "OTHER", note: "coffee\nmachine" }).data?.details).toEqual({
      rejectReason: "OTHER",
      note: "coffee machine",
    });
  });

  it.each([[""], ["   "], ["\n\t "], [undefined], [null]])(
    "stores Other with %j as no note (null)",
    (note) => {
      expect(parse({ rejectReason: "OTHER", note }).data?.details).toEqual({
        rejectReason: "OTHER",
        note: null,
      });
    },
  );

  it("accepts exactly 120 characters", () => {
    expect(parse({ rejectReason: "OTHER", note: "a".repeat(120) }).success).toBe(true);
  });

  it("rejects 121 characters", () => {
    expect(errorOf({ rejectReason: "OTHER", note: "a".repeat(121) })).toBe(
      "Keep the note under 120 characters.",
    );
  });

  it("counts the length after trimming", () => {
    expect(
      parse({ rejectReason: "OTHER", note: `   ${"a".repeat(120)}   ` }).success,
    ).toBe(true);
  });

  it("keeps Myanmar text", () => {
    expect(parse({ rejectReason: "OTHER", note: "ကော်ဖီစက် ပျက်နေ" }).data?.details).toEqual({
      rejectReason: "OTHER",
      note: "ကော်ဖီစက် ပျက်နေ",
    });
  });

  it("refuses a note with any reason other than Other", () => {
    expect(errorOf({ rejectReason: "OUT_OF_STOCK", note: "sold out" })).toBe(
      "A note can only be added for Other.",
    );
  });

  it("accepts another reason without a note, and carries no note", () => {
    expect(parse({ rejectReason: "OUT_OF_STOCK" }).data).toEqual({
      sessionId: 7,
      details: { rejectReason: "OUT_OF_STOCK" },
    });
  });

  it("still refuses an unknown reason", () => {
    expect(parse({ rejectReason: "BORED" }).success).toBe(false);
  });
});
