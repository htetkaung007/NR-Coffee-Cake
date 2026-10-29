import { MAX_MENU_IMAGES } from "@/app/lib/storage/uploadLimits";
import type { MenuImageSlot } from "./menuImageSlots";

/**
 * A menu's photos (MenuImage, CLAUDE.md §7): at most MAX_MENU_IMAGES,
 * positions always continuous 0..n-1 (0 = the main photo on the menu
 * card). The form reorders / removes with makeMain / removeImage; a
 * save is checked by checkImageSlots (Zod, then the service again) and
 * turned into rows by planMenuImages. Pure.
 */

type Positioned = { position: number };

/** The items in position order, renumbered 0..n-1 (no gaps). */
export function normalizePositions<T extends Positioned>(items: readonly T[]): T[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((item, index) => ({ ...item, position: index }));
}

/** The photo at `index` made the main one (position 0); the others keep
 *  their order behind it. An index that isn't there changes nothing. */
export function makeMain<T extends Positioned>(
  items: readonly T[],
  index: number,
): T[] {
  const ordered = normalizePositions(items);
  if (index <= 0 || index >= ordered.length) return ordered;
  const [main] = ordered.splice(index, 1);
  return [main, ...ordered].map((item, position) => ({ ...item, position }));
}

/** The photos without the one at `index`, renumbered. */
export function removeImage<T extends Positioned>(
  items: readonly T[],
  index: number,
): T[] {
  return normalizePositions(items)
    .filter((_, position) => position !== index)
    .map((item, position) => ({ ...item, position }));
}

export type MenuImagesProblem = "MENU_IMAGES_TOO_MANY" | "MENU_IMAGES_INVALID";

/** The English words for each problem (the staff's Myanmar words are
 *  bo.errors.<CODE>). */
export const MENU_IMAGES_MESSAGES: Record<MenuImagesProblem, string> = {
  MENU_IMAGES_TOO_MANY: `A menu can have up to ${MAX_MENU_IMAGES} photos.`,
  MENU_IMAGES_INVALID: "The photo list couldn't be read. Please try again.",
};

/** Is this a list the server can save? At most MAX_MENU_IMAGES slots
 *  and files; no photo twice; every "new:n" points at a sent file and
 *  every sent file is used exactly once. null = fine. */
export function checkImageSlots(
  slots: readonly MenuImageSlot[],
  fileCount: number,
): MenuImagesProblem | null {
  if (slots.length > MAX_MENU_IMAGES || fileCount > MAX_MENU_IMAGES) {
    return "MENU_IMAGES_TOO_MANY";
  }
  const kept = slots.flatMap((slot) => (slot.kind === "keep" ? [slot.imageId] : []));
  const used = slots.flatMap((slot) => (slot.kind === "new" ? [slot.fileIndex] : []));
  const everyFileOnce =
    used.length === fileCount &&
    new Set(used).size === used.length &&
    used.every((index) => index < fileCount);
  if (new Set(kept).size !== kept.length || !everyFileOnce) {
    return "MENU_IMAGES_INVALID";
  }
  return null;
}

export type MenuImagePlan =
  | {
      ok: true;
      /** Same photos, same order — nothing to write. */
      unchanged: boolean;
      /** The menu's MenuImage rows after the save, positions 0..n-1. */
      rows: { imageKey: string; position: number }[];
      /** Files no row points at any more — deleted AFTER the commit. */
      removedKeys: string[];
    }
  | { ok: false; code: MenuImagesProblem }
  | { ok: false; code: "MENU_IMAGE_NOT_FOUND"; imageId: number };

/** What a save does to the menu's photos: `current` (its rows now),
 *  `slots` (the order asked for), `newKeys` (the uploaded new files'
 *  keys, in file order). A kept id must be one of `current` — another
 *  menu's photo is the same "not found" as a missing one. */
export function planMenuImages(
  current: readonly { id: number; imageKey: string; position: number }[],
  slots: readonly MenuImageSlot[],
  newKeys: readonly string[],
): MenuImagePlan {
  const problem = checkImageSlots(slots, newKeys.length);
  if (problem) return { ok: false, code: problem };

  const keyById = new Map(current.map((image) => [image.id, image.imageKey]));
  const rows: { imageKey: string; position: number }[] = [];
  for (const [position, slot] of slots.entries()) {
    if (slot.kind === "new") {
      rows.push({ imageKey: newKeys[slot.fileIndex], position });
      continue;
    }
    const imageKey = keyById.get(slot.imageId);
    if (imageKey === undefined) {
      return { ok: false, code: "MENU_IMAGE_NOT_FOUND", imageId: slot.imageId };
    }
    rows.push({ imageKey, position });
  }

  const ordered = [...current].sort((a, b) => a.position - b.position);
  const before = ordered.map((image) => image.imageKey);
  const sameOrder =
    before.length === rows.length &&
    before.every((imageKey, index) => rows[index].imageKey === imageKey);
  // Rows stored with a gap (0, 2) are rewritten even in the same order.
  const alreadyContinuous = ordered.every((image, index) => image.position === index);
  const keptKeys = new Set(rows.map((row) => row.imageKey));
  return {
    ok: true,
    unchanged: sameOrder && alreadyContinuous,
    rows,
    removedKeys: before.filter((imageKey) => !keptKeys.has(imageKey)),
  };
}
