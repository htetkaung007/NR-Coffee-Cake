import type {
  CartLine,
  DraftLine,
  LabelledCartLine,
} from "@/app/(storefront)/cart/CartList";
import type { ContributorLabel } from "@/app/lib/order/contributors";
import type { LineAddon } from "@/app/lib/order/orderTotals";
import {
  effectiveQuantity,
  voidedQuantity,
  type VoidReason,
} from "@/app/lib/order/voids";

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

/** An OrdersAddon link as fetched with its addon (for the name). */
interface LineAddonSource {
  addonId: number;
  unitPrice: number;
  addon: {
    name: string;
    nameMy?: string | null;
    addonCategory?: { name: string; nameMy?: string | null } | null;
  };
}

/** A line's addon links as the client-side LineAddon shape — the
 *  link's own price snapshot (OrdersAddon.unitPrice), never
 *  Addon.price, same as the line's own unitPrice. The one place this
 *  mapping lives, so every cart/draft/round line carries prices the
 *  same way. */
export function toLineAddons(links: readonly LineAddonSource[]): LineAddon[] {
  return links.map((link) => ({
    id: link.addonId,
    name: link.addon.name,
    nameMy: link.addon.nameMy ?? null,
    groupName: link.addon.addonCategory?.name ?? null,
    groupNameMy: link.addon.addonCategory?.nameMy ?? null,
    unitPrice: link.unitPrice,
  }));
}

/** An Order row (fetched with its menu + addon links) as the cart-line
 *  shape the customer screens render — see CartLine. */
export function toCartLine(order: {
  id: number;
  menuId: number;
  quantity: number;
  note: string | null;
  unitPrice: number;
  menu: { name: string; nameMy?: string | null; assetUrl: string | null };
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
    imageUrl: order.menu.assetUrl,
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
