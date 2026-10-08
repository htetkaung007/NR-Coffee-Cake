import { z } from "zod";
import { idSchema } from "./common";
import { RejectReason } from "../../../../prisma/generated/enums";
import {
  REJECT_NOTE_MAX_LENGTH,
  type RejectDetails,
} from "@/app/lib/order/rejectReason";

/** The cashier's optional note: trimmed, every whitespace run (newlines
 *  too) collapsed to one space, empty → null, at most 120 characters
 *  after that (counted per character, like the VarChar column). Staff
 *  free text — never put it in a URL. */
const rejectNoteSchema = z
  .string()
  .nullish()
  .transform((note) => (note ?? "").replace(/\s+/g, " ").trim() || null)
  .refine(
    (note) =>
      note === null || Array.from(note).length <= REJECT_NOTE_MAX_LENGTH,
    `Keep the note under ${REJECT_NOTE_MAX_LENGTH} characters.`,
  );

/** Cashier rejects a round: which one, why (one of RejectReason's
 *  values) and, for Other only, an optional note. Parses to
 *  { sessionId, details } — details being exactly what cancelSession
 *  accepts (RejectDetails). */
export const rejectRoundSchema = z
  .object({
    sessionId: idSchema,
    rejectReason: z.enum(RejectReason),
    note: rejectNoteSchema,
  })
  .refine((input) => input.note === null || input.rejectReason === "OTHER", {
    message: "A note can only be added for Other.",
    path: ["note"],
  })
  .transform(({ sessionId, rejectReason, note }) => {
    const details: RejectDetails =
      rejectReason === "OTHER" ? { rejectReason, note } : { rejectReason };
    return { sessionId, details };
  });

export type RejectRoundInput = z.input<typeof rejectRoundSchema>;
export type RejectRound = z.output<typeof rejectRoundSchema>;
