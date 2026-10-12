import { z } from "zod";
import { cartLinesSchema } from "./customerOrderSchema";
import { orderTargetSchema } from "@/app/lib/order/orderTarget";

// The staff New Order page keeps its cart in the browser (lib/cart/
// staffCart.ts) and sends the WHOLE cart — the same line schema (menu,
// quantity, add-ons, note, the price last shown) and caps as the
// customer's browser cart. The location always comes from the staff
// session, never from this input.

/** The live check while the order is being built (read-only). */
export const validateStaffCartSchema = z.object({ lines: cartLinesSchema });

/** "Send to kitchen": who it's for (a new takeaway, a round on an open
 *  Counter bill, or a table — lib/order/orderTarget), the lines, and the
 *  idempotency key the browser made when Send was first pressed (see
 *  OrderSession.clientRequestId). */
export const submitStaffOrderSchema = z.object({
  target: orderTargetSchema,
  lines: cartLinesSchema,
  clientRequestId: z.uuid(),
});
export type SubmitStaffOrderRawInput = z.input<typeof submitStaffOrderSchema>;

/** "Did my send go through?" — the request id of a send whose answer
 *  never arrived (StaffCart.pendingRequestId). */
export const staffSubmitStatusSchema = z.object({ clientRequestId: z.uuid() });
