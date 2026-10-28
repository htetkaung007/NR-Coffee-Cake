/**
 * How the menu form tells the server which photos the menu should have,
 * in order (position 0 = the main photo): one slot per photo, sent as
 * the FormData entries "imageSlots" —
 *
 *   "keep:<MenuImage.id>"  a photo the menu already has;
 *   "new:<n>"              the n-th file of "newImages" (0-based).
 *
 * The full list is sent on every save, so a photo left out is removed.
 * Ids only — a stored key never reaches the browser. Pure, client-safe.
 */

export type MenuImageSlot =
  | { kind: "keep"; imageId: number }
  | { kind: "new"; fileIndex: number };

const SLOT_PATTERN = /^(keep|new):(0|[1-9]\d{0,9})$/;

/** One "imageSlots" entry, or null when it isn't one (the schema then
 *  refuses the form). A kept photo's id is ≥ 1. */
export function parseImageSlot(value: unknown): MenuImageSlot | null {
  if (typeof value !== "string") return null;
  const match = SLOT_PATTERN.exec(value);
  if (!match) return null;
  const number = Number(match[2]);
  if (match[1] === "keep") {
    return number >= 1 ? { kind: "keep", imageId: number } : null;
  }
  return { kind: "new", fileIndex: number };
}

/** The form's photos (in order) as the slots + new files to send. */
export function toImageSlots<TFile>(
  photos: readonly (
    | { kind: "keep"; imageId: number }
    | { kind: "new"; file: TFile }
  )[],
): { slots: string[]; files: TFile[] } {
  const files: TFile[] = [];
  const slots = photos.map((photo) => {
    if (photo.kind === "keep") return `keep:${photo.imageId}`;
    files.push(photo.file);
    return `new:${files.length - 1}`;
  });
  return { slots, files };
}
