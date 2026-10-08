/** Per-item order note ("no onion", "extra spicy") — one definition of
 *  the limit and of what counts as a word, shared by the Zod schema
 *  (server-side enforcement) and MenuDetailDialog's live counter, so the
 *  two can never disagree about whether a note is too long. */
export const MAX_ORDER_NOTE_WORDS = 100;

/** Whitespace-separated tokens — not characters. */
export function countWords(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Cuts text off after its first `maxWords` words (keeping the original
 *  spacing inside them). Used as the word-based equivalent of an input's
 *  `maxLength`: typing or pasting past the cap is trimmed back to it. */
export function limitWords(text: string, maxWords = MAX_ORDER_NOTE_WORDS) {
  const wordsWithTrailingSpace = text.match(/\S+\s*/g) ?? [];
  if (wordsWithTrailingSpace.length <= maxWords) return text;
  return wordsWithTrailingSpace.slice(0, maxWords).join("").trimEnd();
}

/** Blank or whitespace-only notes are stored as null, never "" — one
 *  "no note" representation in the database. Also what makes clearing a
 *  note on edit actually clear it (Prisma ignores `undefined`, but
 *  writes `null`). */
export function normalizeOrderNote(note: string | null | undefined) {
  const trimmed = note?.trim();
  return trimmed ? trimmed : null;
}
