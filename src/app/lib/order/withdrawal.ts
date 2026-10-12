import type { BrowserCartLine } from "../cart/browserCart";

/**
 * Customers withdrawing their own round — "Cancel order" / "Change order"
 * on the waiting screen, Counter QR and Table QR. Pure: who may, and the
 * shapes the lines are handed back in for "Change order". The write is
 * OrderSessionService.cancelSession(…, "WITHDRAWN"), the one cancel
 * writer — its status check settles a race with the cashier.
 */

/** Why a round can't be withdrawn (any more). */
export type WithdrawBlock = "notSent" | "accepted" | "cancelled" | "expired";

/** The customer-facing explanation for each block. */
export const WITHDRAW_BLOCK_MESSAGES: Record<WithdrawBlock, string> = {
  notSent: "This order hasn't been sent yet.",
  accepted:
    "The counter already accepted this order. Please ask the staff to change it.",
  cancelled: "This order was already cancelled.",
  expired: "The counter didn't confirm this order in time.",
};

/**
 * THE rule: a customer may withdraw a round only while it waits for
 * approval (PENDING_APPROVAL). A Counter round only while its countdown
 * runs — past its deadline it's about to expire (the next poll writes
 * EXPIRED). A Table round's deadline is a soft target only (it never
 * auto-cancels — approvalDeadline), so it can be withdrawn until the
 * counter decides. Null when allowed.
 */
export function withdrawBlock(
  round: {
    status: string;
    isCounter: boolean;
    approvalExpiresAt: Date | null;
  },
  now: Date,
): WithdrawBlock | null {
  switch (round.status) {
    case "PENDING_APPROVAL":
      break;
    case "CART":
      return "notSent";
    case "CANCELLED":
      return "cancelled";
    default:
      // PENDING / COOKING / COMPLETED / PAID — the counter took it.
      return "accepted";
  }
  if (
    round.isCounter &&
    round.approvalExpiresAt !== null &&
    round.approvalExpiresAt <= now
  ) {
    return "expired";
  }
  return null;
}

/** A sent round's line as both hand-backs read it. */
export interface RoundLineSource {
  menuId: number;
  quantity: number;
  unitPrice: number;
  note: string | null;
  contributorToken: string | null;
  menu: { name: string; assetUrl: string | null };
  OrdersAddons: { addonId: number; unitPrice: number; addon: { name: string } }[];
}

/** Counter "Change order": the round's lines as browser-cart lines (the
 *  cart puts them back with its own merge rule). The shown prices are the
 *  round's snapshots — display only; the cart is re-checked against
 *  today's menu before it can be sent again. */
export function toCounterHandBack(
  lines: readonly RoundLineSource[],
): BrowserCartLine[] {
  return lines.map((line) => ({
    menuId: line.menuId,
    addonIds: line.OrdersAddons.map((link) => link.addonId),
    quantity: line.quantity,
    note: line.note,
    display: {
      name: line.menu.name,
      unitPrice: line.unitPrice,
      addons: line.OrdersAddons.map((link) => ({
        id: link.addonId,
        name: link.addon.name,
        unitPrice: link.unitPrice,
      })),
      imageUrl: line.menu.assetUrl,
    },
  }));
}

/** One draft row to recreate at a table. */
export interface DraftRow {
  tableId: number;
  menuId: number;
  quantity: number;
  unitPrice: number;
  note: string | null;
  /** Whose pick it was — kept, so every phone still sees "You" /
   *  "Customer 2" on it. */
  contributorToken: string | null;
  addons: { addonId: number; unitPrice: number }[];
}

/** Table "Change order": the round's lines as the table's shared draft
 *  again — one row per line, each keeping its customer and the price
 *  snapshots it was ordered at (a draft keeps its own snapshot, as when
 *  first added); stock is checked again at the next Send. */
export function toTableDraftRows(
  lines: readonly RoundLineSource[],
  tableId: number,
): DraftRow[] {
  return lines.map((line) => ({
    tableId,
    menuId: line.menuId,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    note: line.note,
    contributorToken: line.contributorToken,
    addons: line.OrdersAddons.map((link) => ({
      addonId: link.addonId,
      unitPrice: link.unitPrice,
    })),
  }));
}
