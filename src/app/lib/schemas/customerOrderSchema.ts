import { z } from "zod";
import { countWords, MAX_ORDER_NOTE_WORDS } from "@/app/lib/orderNote";

// Shared primitives — every id crossing this boundary is a Prisma
// autoincrement Int (always positive), and "quantity" always means
// the same thing (how many of one menu item) regardless of which
// action it shows up in. One definition each so a future tightening
// (e.g. a lower max on quantity) can't apply to only some actions by
// accident. Exported so the staff order schemas (staffOrderSchema.ts)
// enforce exactly the same rules.
export const positiveInt = z.number().int().positive();
export const quantity = z.number().int().min(1).max(99);
export const addonIds = z.array(positiveInt).default([]);
// Optional per-item instruction ("no onion"). Limited by WORDS, not
// characters — see countWords for what counts as a word. Defined once
// so all four add/update schemas below enforce the same rule.
export const orderNoteSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || countWords(value) <= MAX_ORDER_NOTE_WORDS,
    `Note must be ${MAX_ORDER_NOTE_WORDS} words or fewer.`,
  );

export const addToCartSchema = z.object({
  menuId: positiveInt,
  quantity,
  addonIds,
  note: orderNoteSchema,
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const removeFromCartSchema = z.object({
  orderId: positiveInt,
});
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;

export const updateCartItemSchema = z.object({
  orderId: positiveInt,
  quantity,
  addonIds,
  note: orderNoteSchema,
});
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;

export const menuDetailSchema = z.object({
  menuId: positiveInt,
  locationId: positiveInt,
});
export type MenuDetailInput = z.infer<typeof menuDetailSchema>;

export const addDraftItemSchema = z.object({
  tableId: positiveInt,
  menuId: positiveInt,
  quantity,
  addonIds,
  note: orderNoteSchema,
});
export type AddDraftItemInput = z.infer<typeof addDraftItemSchema>;

export const removeDraftItemSchema = z.object({
  tableId: positiveInt,
  orderId: positiveInt,
});
export type RemoveDraftItemInput = z.infer<typeof removeDraftItemSchema>;

export const updateDraftItemSchema = z.object({
  tableId: positiveInt,
  orderId: positiveInt,
  quantity,
  addonIds,
  note: orderNoteSchema,
});
export type UpdateDraftItemInput = z.infer<typeof updateDraftItemSchema>;

export const submitDraftSchema = z.object({
  tableId: positiveInt,
  locationId: positiveInt,
});
export type SubmitDraftInput = z.infer<typeof submitDraftSchema>;

export const pollTableSchema = z.object({
  tableId: positiveInt,
  locationId: positiveInt,
});
export type PollTableInput = z.infer<typeof pollTableSchema>;
