import type { Prisma } from "../../../../prisma/generated/client";

/** A line's voids as anyone may see them — how many and why. Never who
 *  voided it or the staff's note (those are STAFF_VOID_SELECT's). */
const VOID_SELECT = {
  quantity: true,
  reason: true,
} satisfies Prisma.OrderVoidSelect;

/** A line's voids as the Backoffice shows them: plus when, who and the
 *  note (Other only). Who is the name frozen at void time, with the
 *  linked user as the fallback for older voids (lib/order/voids
 *  voidedByLabel). Never sent to a customer screen. */
const STAFF_VOID_SELECT = {
  ...VOID_SELECT,
  note: true,
  createdAt: true,
  voidedByName: true,
  voidedBy: { select: { name: true, email: true } },
} satisfies Prisma.OrderVoidSelect;

/** An order line as the customer and Backoffice screens show it: its
 *  menu, each add-on with its own price snapshot and name (for the
 *  itemised bill and round cards), and its voids (customer-safe fields
 *  only) — every total built from these lines leaves voided units out
 *  (orderTotals.orderLineTotal). `satisfies` keeps the exact inferred
 *  shape, so callers' result types are unchanged.
 *
 *  An include can't omit the line's OWN columns, so the rows still carry
 *  Order.contributorToken (the key that edits a Table QR draft) unless
 *  the query adds CUSTOMER_LINE_OMIT — ACTIVE_ORDER_LINES does. A raw
 *  row must never reach the client: map it first (lib/order/roundLine,
 *  labelContributors strips the token). */
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

/** The columns a customer line query leaves out at the query level —
 *  defense in depth: contributorToken is the key that edits a Table QR
 *  draft, so a line read for showing never loads it. (Queries that need
 *  it — the Table draft list, labelled by labelContributors — don't
 *  use this.) */
export const CUSTOMER_LINE_OMIT = {
  contributorToken: true,
} satisfies Prisma.OrderOmit;

/** A session's live (not archived) lines, with ORDER_LINE_INCLUDE and
 *  without contributorToken (CUSTOMER_LINE_OMIT) — the `orders` part of
 *  an OrderSession include. A caller that orders the lines adds its own
 *  `orderBy`. */
export const ACTIVE_ORDER_LINES = {
  where: { isArchived: false },
  include: ORDER_LINE_INCLUDE,
  omit: CUSTOMER_LINE_OMIT,
} satisfies Prisma.OrderFindManyArgs;

/** ACTIVE_ORDER_LINES for the Backoffice (STAFF_ORDER_LINE_INCLUDE). */
export const STAFF_ACTIVE_ORDER_LINES = {
  where: { isArchived: false },
  include: STAFF_ORDER_LINE_INCLUDE,
} satisfies Prisma.OrderFindManyArgs;
