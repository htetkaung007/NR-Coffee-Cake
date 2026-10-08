import { describe, it, expect } from "vitest";
import {
  formIdSchema,
  idListSchema,
  idSchema,
  optionalIdListSchema,
} from "./common";

describe("idSchema (numbers only)", () => {
  it("accepts a positive whole number", () => {
    expect(idSchema.safeParse(5).success).toBe(true);
  });

  it("refuses 0, a fraction, or a numeric string", () => {
    expect(idSchema.safeParse(0).success).toBe(false);
    expect(idSchema.safeParse(1.5).success).toBe(false);
    expect(idSchema.safeParse("5").success).toBe(false);
  });
});

describe("formIdSchema (form values)", () => {
  it("coerces a numeric string", () => {
    expect(formIdSchema.parse("7")).toBe(7);
  });

  it("refuses an empty or non-numeric value", () => {
    expect(formIdSchema.safeParse("").success).toBe(false);
    expect(formIdSchema.safeParse("abc").success).toBe(false);
  });
});

describe("idListSchema", () => {
  it("coerces and drops duplicates", () => {
    expect(idListSchema().parse(["1", "2", "1"])).toEqual([1, 2]);
  });

  it("refuses fewer than `min`, with the given message", () => {
    const result = idListSchema({ min: 1, minMessage: "Pick one." }).safeParse(
      [],
    );
    expect(result.error?.issues[0].message).toBe("Pick one.");
  });

  it("refuses more than `max`", () => {
    expect(idListSchema({ max: 2 }).safeParse(["1", "2", "3"]).success).toBe(
      false,
    );
  });
});

describe("optionalIdListSchema", () => {
  it("reads a missing list as []", () => {
    expect(optionalIdListSchema().parse(undefined)).toEqual([]);
  });

  it("drops duplicates", () => {
    expect(optionalIdListSchema().parse(["3", "3"])).toEqual([3]);
  });
});
