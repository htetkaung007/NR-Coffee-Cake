import { z } from "zod";
import { historyDaySchema } from "@/app/lib/schemas/orderHistorySchema";

/** Week or month — what a Backoffice report period spans. */
export const reportPeriodKindSchema = z.enum(["week", "month"]);

/** The one `anchorDay` rule for every report: "YYYY-MM-DD", a real date,
 *  not after today in the shop's timezone (the same rule as the Order
 *  History day — one definition, see historyDaySchema). */
export const reportAnchorDaySchema = historyDaySchema;

/** Overview and Items: a period (kind) around a day. */
export const reportPeriodInputSchema = z.object({
  kind: reportPeriodKindSchema,
  anchorDay: reportAnchorDaySchema,
});
export type ReportPeriodInput = z.infer<typeof reportPeriodInputSchema>;

/** Pairing is always a calendar month, so it takes the day only. */
export const reportPairingInputSchema = z.object({
  anchorDay: reportAnchorDaySchema,
});
export type ReportPairingInput = z.infer<typeof reportPairingInputSchema>;
