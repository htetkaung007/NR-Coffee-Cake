import { z } from "zod";
import { idSchema } from "../schemas/common";

/**
 * Who a staff New Order is for — pure and client-safe. One of:
 * - counterNew — a new takeaway at the counter (a bill of its own);
 * - counterBill — a NEW round on an open Counter bill (its first round,
 *   the bill's root, id `billRootId`) — paid together with it, the same
 *   way a customer's "Order More" joins a bill (billSessionId);
 * - table — a round at a table (a new tab, or onto its open one).
 * Rounds already sent are never edited: the kitchen sees what's new.
 */
export type OrderTarget =
  | { kind: "counterNew" }
  | { kind: "counterBill"; billRootId: number }
  | { kind: "table"; tableId: number };

export const orderTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("counterNew") }),
  z.object({ kind: z.literal("counterBill"), billRootId: idSchema }),
  z.object({ kind: z.literal("table"), tableId: idSchema }),
]);

export const COUNTER_NEW_TARGET: OrderTarget = { kind: "counterNew" };

/** A target as one string — the picker's option value, and for a bill or
 *  a table the SAME key as its Order List entry (entryKeyFor:
 *  "counter-<root id>", "table-<id>"), so a detail page's key is a target
 *  as it stands. */
export function targetKey(target: OrderTarget): string {
  switch (target.kind) {
    case "counterNew":
      return "counter-new";
    case "counterBill":
      return `counter-${target.billRootId}`;
    case "table":
      return `table-${target.tableId}`;
  }
}

/** The target a key names, or null for anything that isn't one. */
export function parseTargetKey(key: string | null | undefined): OrderTarget | null {
  if (!key) return null;
  if (key === "counter-new") return COUNTER_NEW_TARGET;
  const match = /^(counter|table)-([1-9]\d{0,9})$/.exec(key);
  if (!match) return null;
  const id = Number(match[2]);
  return match[1] === "counter"
    ? { kind: "counterBill", billRootId: id }
    : { kind: "table", tableId: id };
}

/** What can be ordered for right now (from the occupancy read). */
export interface TargetOptions {
  /** The location has a counter (a new takeaway is possible). */
  hasCounter: boolean;
  /** Its active seated tables. */
  tableIds: readonly number[];
  /** Its unpaid Counter bills' root ids. */
  openBillRootIds: readonly number[];
}

/** The target if it can still be ordered for — a table that's still
 *  there, a bill that's still open, a counter that exists — else null. */
export function resolveTarget(
  target: OrderTarget | null,
  options: TargetOptions,
): OrderTarget | null {
  if (!target) return null;
  switch (target.kind) {
    case "counterNew":
      return options.hasCounter ? target : null;
    case "counterBill":
      return options.openBillRootIds.includes(target.billRootId) ? target : null;
    case "table":
      return options.tableIds.includes(target.tableId) ? target : null;
  }
}

/** Said when an "Add items" link names an order that's no longer open —
 *  the bo.newOrder message key (the words are in messages/*.json). */
export const CLOSED_LINK_NOTICE = "closedLink" as const;

/** New Order opened from an order's "Add items" (?for=<entry key>): that
 *  order, if it can still be ordered for; otherwise a new takeaway, with
 *  a short notice. Null when there's no link at all. */
export function targetFromLink(
  forParam: string | null | undefined,
  options: TargetOptions,
): { target: OrderTarget | null; notice: typeof CLOSED_LINK_NOTICE | null } | null {
  if (!forParam) return null;
  const target = resolveTarget(parseTargetKey(forParam), options);
  if (target) return { target, notice: null };
  return {
    target: options.hasCounter ? COUNTER_NEW_TARGET : null,
    notice: CLOSED_LINK_NOTICE,
  };
}
