import { describe, it, expect } from "vitest";
import {
  checkImageSlots,
  moveImage,
  normalizePositions,
  planMenuImages,
  removeImage,
} from "./menuImagePlan";
import type { MenuImageSlot } from "./menuImageSlots";

const keep = (imageId: number): MenuImageSlot => ({ kind: "keep", imageId });
const added = (fileIndex: number): MenuImageSlot => ({ kind: "new", fileIndex });

/** The menu's photos as the database holds them. */
const current = [
  { id: 41, imageKey: "menu/7-1700000000000-0000000a.webp", position: 0 },
  { id: 42, imageKey: "menu/7-1700000000001-0000000b.webp", position: 1 },
  { id: 43, imageKey: "menu/7-1700000000002-0000000c.webp", position: 2 },
];
const keyOf = (id: number) => current.find((image) => image.id === id)!.imageKey;
const NEW_A = "menu/7-1730000000000-000000aa.webp";
const NEW_B = "menu/7-1730000000001-000000bb.webp";

describe("normalizePositions", () => {
  it("numbers the photos 0..n-1 in their position order, closing gaps", () => {
    const result = normalizePositions([
      { name: "c", position: 5 },
      { name: "a", position: 0 },
      { name: "b", position: 2 },
    ]);
    expect(result).toEqual([
      { name: "a", position: 0 },
      { name: "b", position: 1 },
      { name: "c", position: 2 },
    ]);
  });

  it("keeps an empty list empty", () => {
    expect(normalizePositions([])).toEqual([]);
  });
});

describe("moveImage", () => {
  const photos = [
    { name: "a", position: 0 },
    { name: "b", position: 1 },
    { name: "c", position: 2 },
  ];

  it("moves a photo one place left, positions staying 0..n-1", () => {
    expect(moveImage(photos, 2, -1)).toEqual([
      { name: "a", position: 0 },
      { name: "c", position: 1 },
      { name: "b", position: 2 },
    ]);
  });

  it("moves a photo one place right — moving the main photo right makes the next one main", () => {
    expect(moveImage(photos, 0, 1).map((photo) => photo.name)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("changes nothing at either end", () => {
    expect(moveImage(photos, 0, -1)).toEqual(photos);
    expect(moveImage(photos, 2, 1)).toEqual(photos);
  });
});

describe("removeImage", () => {
  it("removes a photo and closes the gap", () => {
    expect(
      removeImage(
        [
          { name: "a", position: 0 },
          { name: "b", position: 1 },
          { name: "c", position: 2 },
        ],
        0,
      ),
    ).toEqual([
      { name: "b", position: 0 },
      { name: "c", position: 1 },
    ]);
  });
});

describe("checkImageSlots", () => {
  it("accepts up to 3 photos, each new file used once", () => {
    expect(checkImageSlots([keep(41), added(0), added(1)], 2)).toBeNull();
    expect(checkImageSlots([], 0)).toBeNull();
  });

  it("refuses more than 3 photos", () => {
    expect(
      checkImageSlots([keep(41), keep(42), keep(43), added(0)], 1),
    ).toBe("MENU_IMAGES_TOO_MANY");
  });

  it("refuses more than 3 new files, even if the slots don't use them", () => {
    expect(checkImageSlots([added(0)], 4)).toBe("MENU_IMAGES_TOO_MANY");
  });

  it("refuses the same photo twice", () => {
    expect(checkImageSlots([keep(41), keep(41)], 0)).toBe("MENU_IMAGES_INVALID");
    expect(checkImageSlots([added(0), added(0)], 1)).toBe("MENU_IMAGES_INVALID");
  });

  it("refuses a slot pointing at a file that wasn't sent", () => {
    expect(checkImageSlots([added(1)], 1)).toBe("MENU_IMAGES_INVALID");
  });

  it("refuses a sent file no slot uses", () => {
    expect(checkImageSlots([added(0)], 2)).toBe("MENU_IMAGES_INVALID");
  });
});

describe("planMenuImages", () => {
  it("writes the photos in the order asked, positions 0..n-1", () => {
    const plan = planMenuImages(current, [keep(43), added(0), keep(41)], [NEW_A]);
    expect(plan).toMatchObject({
      ok: true,
      unchanged: false,
      rows: [
        { imageKey: keyOf(43), position: 0 },
        { imageKey: NEW_A, position: 1 },
        { imageKey: keyOf(41), position: 2 },
      ],
    });
  });

  it("lists the photos that are no longer kept, to delete after the save", () => {
    const plan = planMenuImages(current, [keep(42)], []);
    expect(plan.ok && plan.removedKeys).toEqual([keyOf(41), keyOf(43)]);
  });

  it("deletes no file for a pure reorder", () => {
    const plan = planMenuImages(current, [keep(42), keep(43), keep(41)], []);
    expect(plan.ok && plan.removedKeys).toEqual([]);
    expect(plan.ok && plan.rows.map((row) => row.position)).toEqual([0, 1, 2]);
  });

  it("removes every photo when none is kept", () => {
    const plan = planMenuImages(current, [], []);
    expect(plan).toMatchObject({ ok: true, rows: [], removedKeys: current.map((image) => image.imageKey) });
  });

  it("replaces a photo: the new one in its place, the old one to delete", () => {
    const plan = planMenuImages(current, [added(0), keep(42), keep(43)], [NEW_B]);
    expect(plan.ok && plan.rows[0]).toEqual({ imageKey: NEW_B, position: 0 });
    expect(plan.ok && plan.removedKeys).toEqual([keyOf(41)]);
  });

  it("is unchanged when the same photos come back in the same order", () => {
    expect(planMenuImages(current, [keep(41), keep(42), keep(43)], [])).toMatchObject({
      ok: true,
      unchanged: true,
      removedKeys: [],
    });
  });

  it("rewrites rows stored with a gap, even in the same order", () => {
    const gappy = [current[0], { ...current[1], position: 2 }];
    expect(planMenuImages(gappy, [keep(41), keep(42)], [])).toMatchObject({
      ok: true,
      unchanged: false,
      rows: [
        { imageKey: keyOf(41), position: 0 },
        { imageKey: keyOf(42), position: 1 },
      ],
    });
  });

  it("is unchanged for a menu with no photos saved with none", () => {
    expect(planMenuImages([], [], [])).toMatchObject({ ok: true, unchanged: true });
  });

  it("refuses more than 3 photos", () => {
    expect(
      planMenuImages(current, [keep(41), keep(42), keep(43), added(0)], [NEW_A]),
    ).toEqual({ ok: false, code: "MENU_IMAGES_TOO_MANY" });
  });

  it("refuses to keep a photo that isn't this menu's", () => {
    expect(planMenuImages(current, [keep(99)], [])).toEqual({
      ok: false,
      code: "MENU_IMAGE_NOT_FOUND",
      imageId: 99,
    });
  });

  it("refuses a broken slot list", () => {
    expect(planMenuImages(current, [keep(41), keep(41)], [])).toEqual({
      ok: false,
      code: "MENU_IMAGES_INVALID",
    });
  });
});
