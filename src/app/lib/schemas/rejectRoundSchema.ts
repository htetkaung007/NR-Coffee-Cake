import { z } from "zod";
import { RejectReason } from "../../../../prisma/generated/enums";

/** Cashier rejects a round: which one, and why — the reason must be one
 *  of the RejectReason enum's values. */
export const rejectRoundSchema = z.object({
  sessionId: z.number().int().positive(),
  rejectReason: z.enum(RejectReason),
});

export type RejectRoundInput = z.infer<typeof rejectRoundSchema>;
