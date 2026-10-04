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
// so every schema that takes a note enforces the same rule.
export const orderNoteSchema = z
  .string()
  .trim()
  .optional()
  .refine(
    (value) => !value || countWords(value) <= MAX_ORDER_NOTE_WORDS,
    `Note must be ${MAX_ORDER_NOTE_WORDS} words or fewer.`,
  );

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

// Browser-held cart check (validateCartAction) — the whole cart the
// Counter / Online cart keeps in localStorage. Caps keep one request
// small; the business rules themselves live in validateCartLines.
const MAX_CART_LINES = 50;
const MAX_ADDONS_PER_LINE = 20;

const cartLineSchema = z.object({
  menuId: positiveInt,
  // Duplicates count once (the same as the merge rule, lineMergeKey).
  addonIds: addonIds
    .transform((ids) => [...new Set(ids)])
    .refine(
      (ids) => ids.length <= MAX_ADDONS_PER_LINE,
      `A cart line can have at most ${MAX_ADDONS_PER_LINE} add-ons.`,
    ),
  // Any whole number here, NOT the 1–99 `quantity` above: an out-of-range
  // quantity comes back as that line's "invalid" status, so the customer
  // sees which row to fix instead of the whole check failing.
  quantity: z.number().int(),
  // The browser stores "no note" as null.
  note: orderNoteSchema.nullable().transform((note) => note ?? null),
  // What the customer last saw — only compared, never charged.
  displayedUnitPrice: z.number().int().nonnegative().optional(),
});

export const validateCartSchema = z.object({
  locationId: positiveInt,
  lines: z
    .array(cartLineSchema)
    .max(MAX_CART_LINES, `A cart can have at most ${MAX_CART_LINES} lines.`),
});
export type ValidateCartInput = z.infer<typeof validateCartSchema>;
export type ValidateCartRawInput = z.input<typeof validateCartSchema>;

// Submitting the same cart: plus the idempotency key the browser makes
// once per submission (crypto.randomUUID) — see OrderSession.clientRequestId.
export const submitCartSchema = validateCartSchema.extend({
  clientRequestId: z.uuid(),
});
export type SubmitCartInput = z.infer<typeof submitCartSchema>;
export type SubmitCartRawInput = z.input<typeof submitCartSchema>;

// Looking up what became of a sent cart, by the same request id.
export const submittedOutcomeSchema = z.object({
  clientRequestId: z.uuid(),
});
export type SubmittedOutcomeInput = z.infer<typeof submittedOutcomeSchema>;

export const pollTableSchema = z.object({
  tableId: positiveInt,
  locationId: positiveInt,
});
export type PollTableInput = z.infer<typeof pollTableSchema>;
