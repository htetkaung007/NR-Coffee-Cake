import type {
  CartLine,
  DraftLine,
  LabelledCartLine,
} from "@/app/(storefront)/cart/CartList";
import type { ContributorLabel } from "@/app/lib/order/contributors";
import type { LineAddon } from "@/app/lib/order/orderTotals";

/** An OrdersAddon link as fetched with its addon (for the name). */
interface LineAddonSource {
  addonId: number;
  unitPrice: number;
  addon: { name: string };
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
  menu: { name: string; assetUrl: string | null };
  OrdersAddons: LineAddonSource[];
}): CartLine {
  return {
    id: order.id,
    menuId: order.menuId,
    menuName: order.menu.name,
    quantity: order.quantity,
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
