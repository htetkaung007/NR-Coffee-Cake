import type { Prisma } from "../../../../prisma/generated/client";

/** An order line as the customer and Backoffice screens show it: its
 *  menu, and each add-on with its own price snapshot and name (for the
 *  itemised bill and round cards). `satisfies` keeps the exact inferred
 *  shape, so callers' result types are unchanged. */
export const ORDER_LINE_INCLUDE = {
  menu: true,
  OrdersAddons: { include: { addon: true } },
} satisfies Prisma.OrderInclude;

/** A session's live (not archived) lines, with ORDER_LINE_INCLUDE — the
 *  `orders` part of an OrderSession include. A caller that orders the
 *  lines adds its own `orderBy`. */
export const ACTIVE_ORDER_LINES = {
  where: { isArchived: false },
  include: ORDER_LINE_INCLUDE,
} satisfies Prisma.OrderFindManyArgs;
