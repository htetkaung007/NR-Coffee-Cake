/** What deleting a menu does. */
export type MenuDeletionMode = "delete" | "archive";

/**
 * THE rule for deleting a menu: order lines snapshot only the price, not
 * the name — History, receipts, print and Reports read the name through
 * Order.menuId — so a menu any Order row references (table drafts,
 * archived, cancelled and voided lines included) is only archived
 * (hidden everywhere live, still named in old orders). One that was
 * never ordered is deleted for good.
 */
export function menuDeletionMode(orderCount: number): MenuDeletionMode {
  return orderCount === 0 ? "delete" : "archive";
}
