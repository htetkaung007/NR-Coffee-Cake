import type { OrderTarget } from "./orderTarget";

/**
 * The staff New Order's "Order for" is split in two, so "start something
 * new" and "add to something already open" can't be mixed up:
 * - "new"  — a new takeaway, or a FREE table;
 * - "open" — an open Counter bill, or a table IN USE (its open tab).
 * Pure: which mode a target belongs to, and what each mode lists.
 */
export type TargetMode = "new" | "open";

/** What the split reads: the seated tables (counters left out) with
 *  their occupancy, and the open Counter bills. */
export interface ModeSource {
  hasCounter: boolean;
  tables: readonly { id: number; status: "inUse" | "free" }[];
  counterBillRootIds: readonly number[];
}

/** The mode a target belongs to RIGHT NOW — a table follows its
 *  occupancy (free → "new", in use → "open"), so a table that becomes
 *  in use while selected moves the toggle instead of being dropped. A
 *  table not in the list counts as free. */
export function modeOfTarget(target: OrderTarget, source: ModeSource): TargetMode {
  switch (target.kind) {
    case "counterNew":
      return "new";
    case "counterBill":
      return "open";
    case "table": {
      const table = source.tables.find((entry) => entry.id === target.tableId);
      return table?.status === "inUse" ? "open" : "new";
    }
  }
}

/** What one mode lists, in the picker's order: a new takeaway (new mode,
 *  when there's a counter), the open Counter bills (open mode), and the
 *  tables of that mode — free ones for "new", in use for "open". */
export function optionsForMode(
  mode: TargetMode,
  source: ModeSource,
): { counterNew: boolean; counterBillRootIds: number[]; tableIds: number[] } {
  const wanted = mode === "new" ? "free" : "inUse";
  return {
    counterNew: mode === "new" && source.hasCounter,
    counterBillRootIds: mode === "open" ? [...source.counterBillRootIds] : [],
    tableIds: source.tables
      .filter((table) => table.status === wanted)
      .map((table) => table.id),
  };
}

/** "Add to open bill (N)": open Counter bills plus tables in use. */
export function openBillCount(source: ModeSource): number {
  const open = optionsForMode("open", source);
  return open.counterBillRootIds.length + open.tableIds.length;
}
