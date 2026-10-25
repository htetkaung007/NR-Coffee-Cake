/**
 * The customer menu's "Popular" badge — which menus get it. Pure.
 *
 * The sales are what Reports' item sales count over the last
 * POPULAR_DAYS shop days at the location (ReportService
 * .getMenuQuantitiesSold — paid bills, voided units left out). The top
 * POPULAR_TOP by quantity, each with at least POPULAR_MIN_SOLD sold; a
 * tie goes to the lower menu id. Fewer qualify → only those. Customers
 * see the word only, never the numbers.
 */
import { addDays, dayRangeUtc } from "../shopDay";

/** How many shop days back (today included) the sales are counted. */
export const POPULAR_DAYS = 7;
/** At most this many menus are popular. */
export const POPULAR_TOP = 3;
/** A menu needs at least this many sold to be popular. */
export const POPULAR_MIN_SOLD = 5;

export interface MenuQuantitySold {
  menuId: number;
  quantity: number;
}

/** The popular menus' ids, best-selling first. A menu listed more than
 *  once is added up. */
export function popularMenuIds(
  sales: readonly MenuQuantitySold[],
  { top = POPULAR_TOP, minSold = POPULAR_MIN_SOLD }: { top?: number; minSold?: number } = {},
): number[] {
  const totals = new Map<number, number>();
  for (const { menuId, quantity } of sales) {
    totals.set(menuId, (totals.get(menuId) ?? 0) + quantity);
  }
  return [...totals]
    .filter(([, quantity]) => quantity >= minSold)
    .sort(([idA, a], [idB, b]) => b - a || idA - idB)
    .slice(0, top)
    .map(([menuId]) => menuId);
}

/** The UTC range of the last POPULAR_DAYS shop days, `today` (a shop
 *  day, "YYYY-MM-DD") included — from the first day's 00:00 to the end
 *  of today, in the shop's timezone (lib/shopDay). */
export function popularSalesRange(today: string): { start: Date; end: Date } {
  return {
    start: dayRangeUtc(addDays(today, -(POPULAR_DAYS - 1))).start,
    end: dayRangeUtc(today).end,
  };
}
