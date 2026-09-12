import { z } from "zod";

// Shared primitives — every id crossing this boundary is a Prisma
// autoincrement Int (always positive), and "quantity" always means
// the same thing (how many of one menu item) regardless of which
// action it shows up in. One definition each so a future tightening
// (e.g. a lower max on quantity) can't apply to only some actions by
// accident.
const positiveInt = z.number().int().positive();
const quantity = z.number().int().min(1).max(99);
const addonIds = z.array(positiveInt).default([]);

export const addToCartSchema = z.object({
  menuId: positiveInt,
  quantity,
  addonIds,
});
export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const removeFromCartSchema = z.object({
  orderId: positiveInt,
});
export type RemoveFromCartInput = z.infer<typeof removeFromCartSchema>;

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
