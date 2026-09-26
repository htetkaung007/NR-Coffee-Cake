import type { CartLine } from "@/app/(storefront)/cart/CartList";

/** An Order row (fetched with its menu + addon links) as the cart-line
 *  shape the customer screens render — see CartLine. */
export function toCartLine(order: {
  id: number;
  menuId: number;
  quantity: number;
  note: string | null;
  unitPrice: number;
  menu: { name: string; assetUrl: string | null };
  OrdersAddons: { addonId: number; addon: { name: string } }[];
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
    addonNames: order.OrdersAddons.map((link) => link.addon.name),
    addonIds: order.OrdersAddons.map((link) => link.addonId),
    note: order.note,
  };
}
