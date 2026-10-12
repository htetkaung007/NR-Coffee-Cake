import { z } from "zod";
import { idSchema } from "./common";
import { staffNoteSchema } from "./staffNoteSchema";
import { VoidReason } from "../../../../prisma/generated/enums";
import { VOID_NOTE_MAX_LENGTH, type VoidDetails } from "@/app/lib/order/voids";

/** The most rows one display line can merge (identical lines from
 *  different customers) — a cap so one request stays small. */
const MAX_LINE_ROWS = 50;

/** Staff void items off an accepted, unpaid order line: which rows (one
 *  display line — several when identical lines are merged), how many
 *  units, why (VoidReason), for Other only an optional note, and whether
 *  the units go back into stock. Parses to { orderIds, quantity,
 *  details, returnToStock } — details being exactly what
 *  OrderVoidService accepts (VoidDetails). Who it is and which company
 *  come from the session, never from this input. */
export const voidOrderLineSchema = z
  .object({
    orderIds: z.array(idSchema).min(1).max(MAX_LINE_ROWS),
    quantity: z.number().int().min(1, "Void at least one."),
    reason: z.enum(VoidReason, "Choose a reason."),
    note: staffNoteSchema(VOID_NOTE_MAX_LENGTH),
    returnToStock: z.boolean(),
  })
  .refine((input) => input.note === null || input.reason === "OTHER", {
    message: "A note can only be added for Other.",
    path: ["note"],
  })
  .transform(({ orderIds, quantity, reason, note, returnToStock }) => {
    const details: VoidDetails =
      reason === "OTHER" ? { reason, note } : { reason };
    return { orderIds: [...new Set(orderIds)], quantity, details, returnToStock };
  });

export type VoidOrderLineInput = z.input<typeof voidOrderLineSchema>;
