/**
 * The menu grids' order (customer /menu and staff New Order): menus that
 * can be ordered first, then the ones that can't — sold out (stock 0) or
 * switched off — each group keeping the order it came in (stable). The
 * grids filter by category and search FIRST, then order what's left.
 * Nothing is hidden. Pure, client-safe.
 */

/** THE card rule — MenuCard's "orderable": stock left AND switched on. */
export function isOrderableOnCard(menu: {
  stockQuantity: number;
  isAvailable: boolean;
}): boolean {
  return menu.stockQuantity > 0 && menu.isAvailable;
}

export function orderableFirst<Menu extends { stockQuantity: number; isAvailable: boolean }>(
  menus: readonly Menu[],
): Menu[] {
  return [
    ...menus.filter(isOrderableOnCard),
    ...menus.filter((menu) => !isOrderableOnCard(menu)),
  ];
}
