import { z } from "zod";
import {
  addonIds,
  orderNoteSchema,
  positiveInt,
  quantity,
} from "./customerOrderSchema";

// The staff New Order page's cart actions — the same primitives (and the
// same note rule: trimmed, MAX_ORDER_NOTE_WORDS words) as the customer
// cart, plus the session/table ids a staff order carries explicitly
// (there's no QR cookie to read them from).

export const staffAddCartItemSchema = z.object({
  sessionId: positiveInt,
  tableId: positiveInt,
  menuId: positiveInt,
  quantity,
  addonIds,
  note: orderNoteSchema,
});
export type StaffAddCartItemInput = z.infer<typeof staffAddCartItemSchema>;

export const staffUpdateCartItemSchema = z.object({
  sessionId: positiveInt,
  orderId: positiveInt,
  quantity,
  addonIds,
  note: orderNoteSchema,
});
export type StaffUpdateCartItemInput = z.infer<
  typeof staffUpdateCartItemSchema
>;
