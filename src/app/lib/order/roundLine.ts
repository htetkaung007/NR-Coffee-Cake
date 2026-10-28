import type {
  CartLine,
  DraftLine,
  LabelledCartLine,
} from "@/app/(storefront)/cart/CartList";
import type { ContributorLabel } from "@/app/lib/order/contributors";
import {
  effectiveQuantity,
  voidedQuantity,
  type VoidReason,
} from "@/app/lib/order/voids";
import { toLineAddons, type LineAddonSource } from "@/app/lib/order/lineAddons";
import { mainImageUrl } from "@/app/lib/storage/assetUrl";

/** What a customer may know about items staff removed from their line:
 *  how many and the reason(s) — never the staff's note or who did it
 *  (the customer-safe void select carries neither). The screen puts the
 *  reasons into words in the customer's language (voidReason.<VALUE>). */
export interface RemovedByStaff {
  quantity: number;
  /** Each reason once, in the order the voids were made. */
  reasons: VoidReason[];
}

/** A line's voids as the customer sees them — null when none. */
export function removedByStaff(
  voids: readonly { quantity: number; reason: VoidReason }[],
): RemovedByStaff | null {
  const quantity = voidedQuantity(voids);
  if (quantity === 0) return null;
  return { quantity, reasons: [...new Set(voids.map((entry) => entry.reason))] };
}

/** An Order row (fetched with its menu + addon links) as the cart-line
 *  shape the customer screens render — see CartLine. */
export function toCartLine(order: {
  id: number;
  menuId: number;
  quantity: number;
  note: string | null;
  unitPrice: number;
  menu: {
    name: string;
    nameMy?: string | null;
    menuImages: readonly { imageKey: string }[];
  };
  OrdersAddons: LineAddonSource[];
  voids: readonly { quantity: number; reason: VoidReason }[];
}): CartLine {
  return {
    id: order.id,
    menuId: order.menuId,
    menuName: order.menu.name,
    menuNameMy: order.menu.nameMy ?? null,
    // What's still on the order — staff-voided units left out, so every
    // customer total (cartLineTotal) leaves them out too.
    quantity: effectiveQuantity(order),
    removedByStaff: removedByStaff(order.voids),
    // The line's own price snapshot — never Menu.price, which can have
    // moved since this line was added (see Order.unitPrice).
    price: order.unitPrice,
    // The menu's main photo (ORDER_LINE_INCLUDE selects position 0).
    imageUrl: mainImageUrl(order.menu.menuImages),
    addons: toLineAddons(order.OrdersAddons),
    note: order.note,
  };
}

/** Who a line is labelled as when the tab's labels don't know it
 *  (shouldn't happen — the labels cover the whole tab). */
const UNKNOWN: ContributorLabel = { isMine: false, contributorNo: null };

/** A Table QR line (draft or submitted) as the labelled cart-line shape
 *  — toCartLine plus WHO ordered it, as a label from the tab's labels
 *  (TableDraftService.getContributorLabels). The row's contributorToken
 *  is never copied: it doesn't leave the server. */
export function toLabelledCartLine(
  order: Parameters<typeof toCartLine>[0],
  labels: ReadonlyMap<number, ContributorLabel>,
): LabelledCartLine {
  return { ...toCartLine(order), ...(labels.get(order.id) ?? UNKNOWN) };
}

/** A Table QR draft row as the DraftLine shape. */
export function toDraftLine(
  order: Parameters<typeof toCartLine>[0],
  labels: ReadonlyMap<number, ContributorLabel>,
): DraftLine {
  return toLabelledCartLine(order, labels);
}
