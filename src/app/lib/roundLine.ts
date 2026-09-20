import type { CartLine } from "@/app/(storefront)/cart/Cartlist";

/** An Order row (fetched with its menu + addon links) as the cart-line
 *  shape the customer screens render — see CartLine. */
export function toCartLine(order: {
  id: number;
  menuId: number;
  quantity: number;
  note: string | null;
  menu: { name: string; price: number; assetUrl: string | null };
  OrdersAddons: { addonId: number; addon: { name: string } }[];
}): CartLine {
  return {
    id: order.id,
    menuId: order.menuId,
    menuName: order.menu.name,
    quantity: order.quantity,
    price: order.menu.price,
    imageUrl: order.menu.assetUrl,
    addonNames: order.OrdersAddons.map((link) => link.addon.name),
    addonIds: order.OrdersAddons.map((link) => link.addonId),
    note: order.note,
  };
}
