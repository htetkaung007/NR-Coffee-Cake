import { z } from "zod";

/** A staff member's optional free-text note (a rejection's or a void's
 *  "Other" note): trimmed, every whitespace run (newlines too) collapsed
 *  to one space, empty → null, at most `maxLength` characters after that
 *  (counted per character, like the VarChar column). Staff free text —
 *  never put it in a URL. */
export function staffNoteSchema(maxLength: number) {
  return z
    .string()
    .nullish()
    .transform((note) => (note ?? "").replace(/\s+/g, " ").trim() || null)
    .refine(
      (note) => note === null || Array.from(note).length <= maxLength,
      `Keep the note under ${maxLength} characters.`,
    );
}
