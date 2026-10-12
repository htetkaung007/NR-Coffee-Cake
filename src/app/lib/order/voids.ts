import { VoidReason } from "../../../../prisma/generated/enums";

export type { VoidReason };

/**
 * Voids — staff taking items back off an ACCEPTED, UNPAID order (an
 * OrderVoid row per void; written once, never edited). Pure and
 * client-safe. A line's voids only ever reduce what it charges: the
 * money rule (orderTotals.orderLineTotal) prices a line at its
 * effectiveQuantity, so every bill, total and report built on it
 * leaves voided units out.
 */

/** Every reason staff can give, in the enum's order — the order the
 *  Void dialog lists them in. From the Prisma enum, so a new value
 *  can't be forgotten here. */
export const VOID_REASONS = Object.values(VoidReason) as readonly VoidReason[];

const LABELS: Record<VoidReason, string> = {
  CUSTOMER_CHANGED_MIND: "Customer changed mind",
  WRONG_ITEM: "Wrong item",
  OTHER: "Other",
};

/** The reason as staff and customers read it ("Wrong item"). */
export function voidReasonLabel(reason: VoidReason): string {
  return LABELS[reason];
}

/** The hard limit on a void note (also the DB column's VarChar). */
export const VOID_NOTE_MAX_LENGTH = 120;

/** What a void carries into OrderVoidService: only Other may have a
 *  note (null when left empty) — a note on any other reason is a
 *  compile error. */
export type VoidDetails =
  | { reason: "OTHER"; note: string | null }
  | { reason: Exclude<VoidReason, "OTHER"> };

/** How many units of a line its voids took back. */
export function voidedQuantity(voids: readonly { quantity: number }[]) {
  return voids.reduce((sum, entry) => sum + entry.quantity, 0);
}

/** What a line still charges for: its quantity minus everything voided —
 *  never below 0. Also how much of it can still be voided. */
export function effectiveQuantity(line: {
  quantity: number;
  voids: readonly { quantity: number }[];
}) {
  return Math.max(0, line.quantity - voidedQuantity(line.voids));
}

/** How many items lines still hold — voided units left out ("2 items"
 *  on a round, a bill, a history row). */
export function effectiveItemCount(
  lines: readonly { quantity: number; voids: readonly { quantity: number }[] }[],
) {
  return lines.reduce((sum, line) => sum + effectiveQuantity(line), 0);
}

/** A round whose lines can be voided: accepted (past approval) and not
 *  finished — PENDING or COOKING. Never one awaiting approval (that's
 *  Reject's job), never a paid, completed, cancelled or unsent one. */
export const VOIDABLE_ROUND_STATUSES = ["PENDING", "COOKING"] as const;

export function isVoidableRoundStatus(status: string) {
  return (VOIDABLE_ROUND_STATUSES as readonly string[]).includes(status);
}

/**
 * How to take `requested` units off a display line made of one or more
 * Order rows (identical lines merged for display — mergeLinesForDisplay):
 * from the rows in the order given, each up to what's left of it. One
 * entry per row touched. Null when the rows don't have that many left
 * (or `requested` isn't a positive whole number) — nothing to write.
 */
export function planVoid(
  rows: readonly {
    id: number;
    quantity: number;
    voids: readonly { quantity: number }[];
  }[],
  requested: number,
): { orderId: number; quantity: number }[] | null {
  if (!Number.isInteger(requested) || requested < 1) return null;
  const plan: { orderId: number; quantity: number }[] = [];
  let left = requested;
  for (const row of rows) {
    if (left === 0) break;
    const take = Math.min(left, effectiveQuantity(row));
    if (take > 0) {
      plan.push({ orderId: row.id, quantity: take });
      left -= take;
    }
  }
  return left === 0 ? plan : null;
}
