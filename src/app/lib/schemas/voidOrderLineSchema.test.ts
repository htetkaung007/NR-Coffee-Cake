import { describe, it, expect } from "vitest";
import { voidOrderLineSchema } from "./voidOrderLineSchema";

const valid = {
  orderIds: [5],
  quantity: 1,
  reason: "WRONG_ITEM",
  note: null,
  returnToStock: true,
};
const parse = (input: Record<string, unknown>) =>
  voidOrderLineSchema.safeParse({ ...valid, ...input });
const errorOf = (input: Record<string, unknown>) => {
  const result = parse(input);
  return result.success ? null : result.error.issues[0]?.message;
};

describe("voidOrderLineSchema", () => {
  it("parses to the rows, quantity, details and stock choice", () => {
    expect(parse({}).data).toEqual({
      orderIds: [5],
      quantity: 1,
      details: { reason: "WRONG_ITEM" },
      returnToStock: true,
    });
  });

  it("keeps a note on Other — trimmed, whitespace collapsed", () => {
    expect(
      parse({ reason: "OTHER", note: "  spilled \n on   the floor " }).data?.details,
    ).toEqual({ reason: "OTHER", note: "spilled on the floor" });
  });

  it("stores an empty Other note as null", () => {
    expect(parse({ reason: "OTHER", note: "   " }).data?.details).toEqual({
      reason: "OTHER",
      note: null,
    });
  });

  it("refuses a note on any reason but Other", () => {
    expect(errorOf({ reason: "WRONG_ITEM", note: "oops" })).toBe(
      "A note can only be added for Other.",
    );
  });

  it("refuses a note over 120 characters", () => {
    expect(errorOf({ reason: "OTHER", note: "x".repeat(121) })).toBe(
      "Keep the note under 120 characters.",
    );
  });

  it("requires a known reason", () => {
    expect(errorOf({ reason: "BORED" })).toBe("Choose a reason.");
  });

  it("refuses voiding 0 or a fraction", () => {
    expect(errorOf({ quantity: 0 })).toBe("Void at least one.");
    expect(parse({ quantity: 1.5 }).success).toBe(false);
  });

  it("needs at least one row, and counts a repeated row once", () => {
    expect(parse({ orderIds: [] }).success).toBe(false);
    expect(parse({ orderIds: [5, 5, 6] }).data?.orderIds).toEqual([5, 6]);
  });
});
