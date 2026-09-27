import type { CartLine, DraftLine } from "@/app/(storefront)/cart/CartList";
import type { LineAddon } from "@/app/lib/orderTotals";

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

/** A Table QR draft row as the DraftLine shape — toCartLine plus whose
 *  pick it is. */
export function toDraftLine(
  order: Parameters<typeof toCartLine>[0] & { contributorToken: string | null },
): DraftLine {
  return {
    ...toCartLine(order),
    contributorToken: order.contributorToken ?? "",
  };
}
