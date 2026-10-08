import { lineTotal } from "../order/orderTotals";
import { percentOf } from "./percent";
import { percentChange } from "./salesReport";

/** An add-on on a paid order line, with its own price snapshot
 *  (OrdersAddon.unitPrice). `isRequiredGroup`: it came from a REQUIRED
 *  add-on group (a size, say) rather than an optional extra. */
export interface ReportLineAddon {
  addonId: number;
  unitPrice: number;
  isRequiredGroup: boolean;
}

/** One paid order line — the unit price and the add-on prices are the
 *  line's own snapshots (see Order.unitPrice), never today's prices. */
export interface ReportLine {
  menuId: number;
  quantity: number;
  unitPrice: number;
  addons: ReportLineAddon[];
}

/** What one menu sold: units, and sales of the MENU part only
 *  (Σ unitPrice × quantity — its add-ons are counted separately). */
export interface MenuSalesRow {
  menuId: number;
  quantity: number;
  itemSales: number;
}

/** How often an add-on was picked (once per unit of the line that had
 *  it) and what that made. Required-group add-ons count here too, so the
 *  totals reconcile with the bills. */
export interface AddonSalesRow {
  addonId: number;
  timesChosen: number;
  addonSales: number;
}

export interface ItemAggregate {
  menus: MenuSalesRow[];
  addons: AddonSalesRow[];
  /** Σ itemSales over every menu. */
  itemsTotal: number;
  /** Σ addonSales over every add-on. */
  addonsTotal: number;
}

export interface NamedMenuSalesRow extends MenuSalesRow {
  name: string;
}

export type ItemSortBy = "sales" | "quantity";

export interface MenuChange {
  menuId: number;
  /** Percent change in itemSales on the previous period, one decimal;
   *  null when that menu had no sales then. */
  deltaPercent: number | null;
}

/** Runs `add` on the map's row for `key`, creating the row from `empty`
 *  first when there isn't one yet. */
function bump<Key, Row>(
  rows: Map<Key, Row>,
  key: Key,
  empty: () => Row,
  add: (row: Row) => void,
) {
  const row = rows.get(key) ?? empty();
  add(row);
  rows.set(key, row);
}

const sumBy = <Row>(rows: readonly Row[], pick: (row: Row) => number) =>
  rows.reduce((sum, row) => sum + pick(row), 0);

/** Splits each line's total (THE line-total rule, orderTotals.lineTotal)
 *  into its menu part and its add-ons: menu = lineTotal(unitPrice, [],
 *  quantity), each add-on = lineTotal(0, [its price], quantity) — so the
 *  two halves always add up to what the bill charged. */
export function aggregateItems(lines: readonly ReportLine[]): ItemAggregate {
  const menus = new Map<number, MenuSalesRow>();
  const addons = new Map<number, AddonSalesRow>();

  for (const line of lines) {
    bump(
      menus,
      line.menuId,
      () => ({ menuId: line.menuId, quantity: 0, itemSales: 0 }),
      (row) => {
        row.quantity += line.quantity;
        row.itemSales += lineTotal(line.unitPrice, [], line.quantity);
      },
    );
    for (const { addonId, unitPrice } of line.addons) {
      bump(
        addons,
        addonId,
        () => ({ addonId, timesChosen: 0, addonSales: 0 }),
        (row) => {
          row.timesChosen += line.quantity;
          row.addonSales += lineTotal(0, [unitPrice], line.quantity);
        },
      );
    }
  }

  const menuRows = [...menus.values()];
  const addonRows = [...addons.values()];
  return {
    menus: menuRows,
    addons: addonRows,
    itemsTotal: sumBy(menuRows, (row) => row.itemSales),
    addonsTotal: sumBy(addonRows, (row) => row.addonSales),
  };
}

/** Best first by the chosen measure; equal values order by name, then by
 *  id, so the order never depends on the input order. Each row gets its
 *  `share`: itemSales as a percent of the rows' itemSales, one decimal,
 *  0 when they sold nothing. Extra fields on the rows are kept; the rows
 *  given are not changed. */
export function rankItems<Row extends NamedMenuSalesRow>(
  rows: readonly Row[],
  options: { sortBy: ItemSortBy },
): (Row & { share: number })[] {
  const measure = (row: Row) =>
    options.sortBy === "sales" ? row.itemSales : row.quantity;
  const total = sumBy(rows, (row) => row.itemSales);
  return rows
    .map((row) => ({ ...row, share: percentOf(row.itemSales, total, 1) }))
    .sort(
      (a, b) =>
        measure(b) - measure(a) ||
        a.name.localeCompare(b.name, "en") ||
        a.menuId - b.menuId,
    );
}

/** The orderable menus that sold least — menus with no sales at all
 *  included — fewest units first, `limit` of them. Equal units order by
 *  menu id. A menu that is no longer orderable is never listed, even if
 *  it sold. */
export function findSlowSellers(
  orderableMenuIds: readonly number[],
  rows: readonly Pick<MenuSalesRow, "menuId" | "quantity">[],
  limit: number,
): { menuId: number; quantity: number }[] {
  const sold = new Map(rows.map((row) => [row.menuId, row.quantity]));
  return [...new Set(orderableMenuIds)]
    .map((menuId) => ({ menuId, quantity: sold.get(menuId) ?? 0 }))
    .sort((a, b) => a.quantity - b.quantity || a.menuId - b.menuId)
    .slice(0, Math.max(0, limit));
}

/** For each menu that sold in `currentRows`: its change in item sales on
 *  `previousRows`. A menu that only sold in the previous period isn't
 *  listed. */
export function compareToPrevious(
  currentRows: readonly Pick<MenuSalesRow, "menuId" | "itemSales">[],
  previousRows: readonly Pick<MenuSalesRow, "menuId" | "itemSales">[],
): MenuChange[] {
  const before = new Map(previousRows.map((row) => [row.menuId, row.itemSales]));
  return currentRows.map((row) => ({
    menuId: row.menuId,
    deltaPercent: percentChange(row.itemSales, before.get(row.menuId)),
  }));
}

/** Do the report's two halves explain the bills? Items + add-ons must be
 *  exactly the PAID bills' total — the check that nothing was dropped or
 *  counted twice. */
export function reconciles(
  itemsTotal: number,
  addonsTotal: number,
  billsSalesTotal: number,
): boolean {
  return itemsTotal + addonsTotal === billsSalesTotal;
}
