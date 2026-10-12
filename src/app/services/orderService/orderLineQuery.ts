import type { Prisma } from "../../../../prisma/generated/client";

/** A line's voids as anyone may see them — how many and why. Never who
 *  voided it or the staff's note (those are STAFF_VOID_SELECT's). */
const VOID_SELECT = {
  quantity: true,
  reason: true,
} satisfies Prisma.OrderVoidSelect;

/** A line's voids as the Backoffice shows them: plus when, who and the
 *  note (Other only). Never sent to a customer screen. */
const STAFF_VOID_SELECT = {
  ...VOID_SELECT,
  note: true,
  createdAt: true,
  voidedBy: { select: { name: true, email: true } },
} satisfies Prisma.OrderVoidSelect;

/** An order line as the customer and Backoffice screens show it: its
 *  menu, each add-on with its own price snapshot and name (for the
 *  itemised bill and round cards), and its voids (customer-safe fields
 *  only) — every total built from these lines leaves voided units out
 *  (orderTotals.orderLineTotal). `satisfies` keeps the exact inferred
 *  shape, so callers' result types are unchanged. */
export const ORDER_LINE_INCLUDE = {
  menu: true,
  OrdersAddons: { include: { addon: true } },
  voids: { select: VOID_SELECT, orderBy: { id: "asc" } },
} satisfies Prisma.OrderInclude;

/** A line's `voids` for the Backoffice — with who, when and the note. */
export const STAFF_LINE_VOIDS = {
  select: STAFF_VOID_SELECT,
  orderBy: { id: "asc" },
} satisfies Prisma.Order$voidsArgs;

/** A line's `voids` when only the count matters (totals, item counts) —
 *  what orderTotals.orderLineTotal needs at the least. */
export const LINE_VOID_QUANTITIES = {
  select: { quantity: true },
} satisfies Prisma.Order$voidsArgs;

/** ORDER_LINE_INCLUDE for the Backoffice only — voids with who, when and
 *  the note. */
const STAFF_ORDER_LINE_INCLUDE = {
  ...ORDER_LINE_INCLUDE,
  voids: STAFF_LINE_VOIDS,
} satisfies Prisma.OrderInclude;

/** A session's live (not archived) lines, with ORDER_LINE_INCLUDE — the
 *  `orders` part of an OrderSession include. A caller that orders the
 *  lines adds its own `orderBy`. */
export const ACTIVE_ORDER_LINES = {
  where: { isArchived: false },
  include: ORDER_LINE_INCLUDE,
} satisfies Prisma.OrderFindManyArgs;

/** ACTIVE_ORDER_LINES for the Backoffice (STAFF_ORDER_LINE_INCLUDE). */
export const STAFF_ACTIVE_ORDER_LINES = {
  where: { isArchived: false },
  include: STAFF_ORDER_LINE_INCLUDE,
} satisfies Prisma.OrderFindManyArgs;
