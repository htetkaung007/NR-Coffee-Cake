import { ValidationError } from "../errors";

/** Which locations a menu shows at — the decision behind
 *  MenuLocationService.setMenuLocations, pure so it can be tested
 *  without a database. Menus are company-wide; a menu is hidden at a
 *  location by an active DisableLocationMenus row, and needs a MenuStock
 *  row wherever it shows. */
export interface MenuLocationFacts {
  /** The company's active (not archived) locations. */
  activeLocationIds: readonly number[];
  /** Where the owner wants the menu to show. */
  shownLocationIds: readonly number[];
  /** Locations with an ACTIVE DisableLocationMenus row for this menu. */
  hiddenLocationIds: readonly number[];
  /** Locations that already have a MenuStock row for this menu. */
  stockLocationIds: readonly number[];
}

export interface MenuLocationPlan {
  /** Shown, but hidden today — archive their active hide rows. */
  unhide: number[];
  /** Not shown, and not hidden yet — add ONE active hide row each. */
  hide: number[];
  /** Shown, with no stock row yet — create one (never overwrite). */
  createStock: number[];
}

export const NO_LOCATION_MESSAGE = "Choose at least one location.";

/** What setMenuLocations must write so the menu shows at exactly
 *  `shownLocationIds` among the active locations. Throws ValidationError
 *  when nothing is shown or an id isn't one of the active locations. A
 *  hidden location keeps its stock row, so showing it again brings its
 *  old stock back; archived locations are left alone. */
export function planMenuLocations(facts: MenuLocationFacts): MenuLocationPlan {
  const active = new Set(facts.activeLocationIds);
  const shown = new Set(facts.shownLocationIds);
  if (shown.size === 0) throw new ValidationError(NO_LOCATION_MESSAGE);
  for (const locationId of shown) {
    if (!active.has(locationId)) {
      throw new ValidationError("Choose locations from your own company.");
    }
  }

  const hidden = new Set(facts.hiddenLocationIds);
  const stocked = new Set(facts.stockLocationIds);
  const activeIds = [...active];
  return {
    unhide: activeIds.filter((id) => shown.has(id) && hidden.has(id)),
    hide: activeIds.filter((id) => !shown.has(id) && !hidden.has(id)),
    createStock: activeIds.filter((id) => shown.has(id) && !stocked.has(id)),
  };
}
