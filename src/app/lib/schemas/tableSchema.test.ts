import { describe, it, expect } from "vitest";
import { createTableSchema, updateTableSchema } from "./tableSchema";

const png = (bytes: number) =>
  new File([new Uint8Array(bytes)], "logo.png", { type: "image/png" });

describe("createTableSchema", () => {
  it("requires a name for a regular table", () => {
    const result = createTableSchema.safeParse({
      name: "  ",
      isCounter: false,
      logo: null,
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe("Table name is required.");
  });

  it("accepts an empty name for the Counter", () => {
    expect(
      createTableSchema.safeParse({ name: "", isCounter: true, logo: null })
        .success,
    ).toBe(true);
  });

  it("defaults isCounter to false", () => {
    const result = createTableSchema.safeParse({ name: "Table 1", logo: null });
    expect(result.success && result.data.isCounter).toBe(false);
  });
});

describe("updateTableSchema", () => {
  it("requires a name", () => {
    expect(updateTableSchema.safeParse({ name: "", logo: null }).success).toBe(
      false,
    );
  });
});

describe("the shared logo rule (create and update)", () => {
  it("accepts no logo, or a small PNG", () => {
    expect(updateTableSchema.safeParse({ name: "A", logo: null }).success).toBe(
      true,
    );
    expect(
      updateTableSchema.safeParse({ name: "A", logo: png(10) }).success,
    ).toBe(true);
  });

  it("refuses a logo over 5MB", () => {
    const result = createTableSchema.safeParse({
      name: "A",
      logo: png(5 * 1024 * 1024 + 1),
    });
    expect(result.error?.issues[0].message).toBe(
      "Logo must be 5MB or smaller.",
    );
  });

  it("refuses a file that isn't PNG, JPEG or WEBP", () => {
    const gif = new File(["x"], "logo.gif", { type: "image/gif" });
    const result = updateTableSchema.safeParse({ name: "A", logo: gif });
    expect(result.error?.issues[0].message).toBe(
      "Logo must be a PNG, JPEG, or WEBP file.",
    );
  });
});
