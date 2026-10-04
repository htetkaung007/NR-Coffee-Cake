import { z } from "zod";
import { isRealCalendarDay, todayInShop } from "@/app/lib/shopDay";

const DAY_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

/** A shop day the customer-facing history/report screens may ask for —
 *  also what the Backoffice reports take as their `anchorDay`. */
export const historyDaySchema = z
  .string()
  .regex(DAY_FORMAT, "Day must be in YYYY-MM-DD format.")
  .refine(isRealCalendarDay, { message: "Day must be a real date." })
  // String comparison is safe here — "YYYY-MM-DD" sorts the same
  // lexicographically as chronologically.
  .refine((value) => value <= todayInShop(), {
    message: "Day can't be after today.",
  });

const historyTabSchema = z.enum(["paid", "cancelled"]);

export const historyListInputSchema = z.object({
  tab: historyTabSchema,
  day: historyDaySchema,
  search: z.string().trim().max(50).optional(),
  cursor: z.string().max(500).optional(),
});
export type HistoryListInput = z.infer<typeof historyListInputSchema>;

export const historySummaryInputSchema = z.object({
  day: historyDaySchema,
});
export type HistorySummaryInput = z.infer<typeof historySummaryInputSchema>;

export const historyDetailInputSchema = z.object({
  tab: historyTabSchema,
  id: z.number().int().positive(),
});
export type HistoryDetailInput = z.infer<typeof historyDetailInputSchema>;
