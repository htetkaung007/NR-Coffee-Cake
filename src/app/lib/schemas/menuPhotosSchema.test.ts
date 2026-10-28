import { describe, it, expect } from "vitest";
import { createMenuSchema } from "./menu_menuCategorySchema";
import { MAX_IMAGE_BYTES } from "@/app/lib/storage/uploadLimits";

/** A menu form that passes on everything except what each test sets. */
const base = {
  name: "Latte",
  nameMy: "",
  description: "",
  descriptionMy: "",
  price: "3500",
  quantity: "10",
  isAvailable: true,
  categoryIds: ["1"],
  addonCategoryIds: [],
  shownLocationIds: ["2"],
};

const png = (bytes = 10) =>
  new File([new Uint8Array(bytes)], "photo.png", { type: "image/png" });

function parse(imageSlots: unknown[], newImages: unknown[]) {
  return createMenuSchema.safeParse({ ...base, imageSlots, newImages });
}

describe("createMenuSchema — photos", () => {
  it("accepts kept photos and new files, reading the slots", () => {
    const result = parse(["keep:41", "new:0", "new:1"], [png(), png()]);
    expect(result.success).toBe(true);
    expect(result.data?.imageSlots).toEqual([
      { kind: "keep", imageId: 41 },
      { kind: "new", fileIndex: 0 },
      { kind: "new", fileIndex: 1 },
    ]);
  });

  it("accepts a menu with no photos", () => {
    expect(parse([], []).success).toBe(true);
  });

  it("refuses more than 3 photos", () => {
    expect(parse(["keep:1", "keep:2", "keep:3", "new:0"], [png()]).success).toBe(false);
  });

  it("refuses more than 3 new files", () => {
    expect(
      parse(["new:0", "new:1", "new:2", "new:3"], [png(), png(), png(), png()]).success,
    ).toBe(false);
  });

  it("refuses a slot it can't read", () => {
    expect(parse(["keep:abc"], []).success).toBe(false);
  });

  it("refuses a new photo whose file wasn't sent, and a file no photo uses", () => {
    expect(parse(["new:1"], [png()]).success).toBe(false);
    expect(parse(["new:0"], [png(), png()]).success).toBe(false);
  });

  it("refuses the same photo twice", () => {
    expect(parse(["keep:41", "keep:41"], []).success).toBe(false);
  });

  it("refuses a file that isn't a PNG, JPEG or WEBP", () => {
    const gif = new File(["gif"], "a.gif", { type: "image/gif" });
    expect(parse(["new:0"], [gif]).success).toBe(false);
  });

  it("refuses a file over the per-image limit", () => {
    expect(parse(["new:0"], [png(MAX_IMAGE_BYTES + 1)]).success).toBe(false);
  });

  it("refuses an empty file", () => {
    expect(parse(["new:0"], [png(0)]).success).toBe(false);
  });
});
