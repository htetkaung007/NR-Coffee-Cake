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

/** THE "can this menu be ordered here" rule — a menu is orderable only
 *  when every source allows it. Shared by the cart check
 *  (CartValidationService.loadCatalog) and the reports' list of orderable
 *  menus, so the two can't disagree. */
export function isMenuOrderable(facts: MenuOrderabilityFacts): boolean {
  return (
    !facts.isArchived &&
    !facts.isManuallyDisabled &&
    !facts.isDisabledHere &&
    facts.hasVisibleCategory
  );
}
