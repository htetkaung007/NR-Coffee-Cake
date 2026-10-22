import { menuCardStatus } from "./menuCardStatus";

/**
 * The Backoffice Menus page's status chips (?status=): all menus, the
 * sold-out ones, or the switched-off ones — by menuCardStatus, THE card
 * status rule (so a switched-off menu with no stock is "off" only, and a
 * menu hidden at this location is neither). Filtering never reorders.
 * Pure.
 */
export const MENU_STATUS_FILTERS = ["all", "soldOut", "unavailable"] as const;
export type MenuStatusFilter = (typeof MENU_STATUS_FILTERS)[number];

/** The menu facts menuCardStatus reads. */
type StatusFacts = Parameters<typeof menuCardStatus>[0];

/** A URL value as a filter: one of the three, else "all" (untrusted). */
export function parseMenuStatusFilter(value: string | undefined): MenuStatusFilter {
  return (MENU_STATUS_FILTERS as readonly string[]).includes(value ?? "")
    ? (value as MenuStatusFilter)
    : "all";
}

function matches(menu: StatusFacts, filter: MenuStatusFilter) {
  return filter === "all" || menuCardStatus(menu) === filter;
}

/** The menus the filter keeps, in the order given. */
export function filterMenusByStatus<Menu extends StatusFacts>(
  menus: readonly Menu[],
  filter: MenuStatusFilter,
): Menu[] {
  return menus.filter((menu) => matches(menu, filter));
}

/** Each chip's count. */
export function countMenusByStatus(
  menus: readonly StatusFacts[],
): Record<MenuStatusFilter, number> {
  return {
    all: menus.length,
    soldOut: menus.filter((menu) => matches(menu, "soldOut")).length,
    unavailable: menus.filter((menu) => matches(menu, "unavailable")).length,
  };
}
