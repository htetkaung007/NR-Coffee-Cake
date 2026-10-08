/** What decides whether a menu can be ordered at one location. */
export interface MenuOrderabilityFacts {
  isArchived: boolean;
  /** MenuStock.isManuallyDisabled — the staff "available" switch; false
   *  when the menu has no stock row. */
  isManuallyDisabled: boolean;
  /** An active (not archived) DisableLocationMenus row for this location. */
  isDisabledHere: boolean;
  /** Linked to at least one category that is visible at this location. */
  hasVisibleCategory: boolean;
}

/** Is this menu on the menu at this location at all — listed for
 *  customers and the staff POS? Every orderability source except the
 *  staff on/off switch: a switched-off (or stock-0) menu is still listed,
 *  shown as sold out / unavailable, while a menu hidden here, archived,
 *  or in no category visible here is not listed at all. The listing half
 *  of isMenuOrderable — the two can't disagree. */
export function isMenuListed(
  facts: Omit<MenuOrderabilityFacts, "isManuallyDisabled">,
): boolean {
  return !facts.isArchived && !facts.isDisabledHere && facts.hasVisibleCategory;
}

/** THE "can this menu be ordered here" rule — a menu is orderable only
 *  when every source allows it: it's listed here (isMenuListed) and its
 *  on/off switch is on. Shared by the cart check
 *  (CartValidationService.loadCatalog) and the reports' list of orderable
 *  menus, so the two can't disagree. */
export function isMenuOrderable(facts: MenuOrderabilityFacts): boolean {
  return isMenuListed(facts) && !facts.isManuallyDisabled;
}

/** The safe message for adding / sending a menu that isn't listed at
 *  the location (hidden here, archived, or in no visible category). */
export function notAvailableHereMessage(menuName: string): string {
  return `"${menuName}" isn't available at this location.`;
}
