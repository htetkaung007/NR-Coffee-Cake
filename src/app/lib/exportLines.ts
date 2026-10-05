/** The Reports page's two line exports for the displayed period (week or
 *  month): every PAID order line, and every line of each round that was
 *  REJECTED or TIMED OUT. Pure — the caller loads plain rows (types
 *  below) and these turn them into CSV rows; csv.ts encodes them.
 *
 *  Both files share ONE definition of the line columns (sharedLineCells
 *  + SHARED_LINE_HEADERS), so the two can never drift apart. Prices are
 *  each line's own snapshots; line_total goes through orderTotals'
 *  lineTotal, the only line-total rule. Times are on the shop's clock
 *  (Asia/Yangon, shopDay.ts). No tokens, cookies or internal ids other
 *  than the listed columns ever go in. */

import { waitSeconds } from "./cancellation";
import { csvNumber, csvText, toCsv, type CsvColumn } from "./csv";
import { lineTotal } from "./orderTotals";
import type { ReportPeriod } from "./reportPeriod";
import { rejectReasonLabel, type RejectReason } from "./rejectReason";
import { toShopDay, toShopTime } from "./shopDay";

// ── Input (plain rows the caller loads) ─────────────────────────────────

/** One add-on on a line, with its own price snapshot (for ONE unit). */
export interface ExportLineAddon {
  name: string;
  unitPrice: number;
}

/** One order line, with its snapshots. */
export interface ExportLine {
  id: number;
  menuId: number;
  menuName: string;
  quantity: number;
  /** Menu price snapshot for one unit. */
  unitPrice: number;
  addons: ExportLineAddon[];
  /** The customer's per-item note ("no onion"); null when none. */
  note: string | null;
}

/** One round (OrderSession) of a paid bill. */
export interface ExportRound {
  orderNumber: string;
  /** Decides round_no: 1, 2, … within the bill, oldest first. */
  createdAt: Date;
  lines: ExportLine[];
}

/** One PAID bill. `total` is Bill.total — the sum of its line totals. */
export interface ExportBill {
  id: number;
  billNumber: string;
  paidAt: Date;
  total: number;
  channel: "table" | "counter";
  /** The table's name; null for the counter. */
  tableName: string | null;
  rounds: ExportRound[];
}

/** One cancelled round — every cancel reason may come in; only REJECTED
 *  and EXPIRED rounds are exported. */
export interface ExportCancelledRound {
  orderNumber: string;
  channel: "table" | "counter";
  tableName: string | null;
  cancelReason: "REJECTED" | "EXPIRED" | "UNSUBMITTED";
  /** When the round was cancelled (its last write) — the sort key for a
   *  round with no cancellation row. */
  cancelledAt: Date;
  /** Its OrderCancellation row; null when it was cancelled before those
   *  were recorded (the detail columns then stay empty — never guessed). */
  cancellation: {
    requestedAt: Date;
    decidedAt: Date;
    rejectReason: RejectReason | null;
    /** The cashier's note — Other only. */
    note: string | null;
  } | null;
  /** Archived lines are skipped. */
  lines: (ExportLine & { isArchived: boolean })[];
}

// ── Output rows (keyed by the CSV header names) ─────────────────────────

/** The line columns BOTH files end with, in this order. */
export const SHARED_LINE_HEADERS = [
  "menu_id",
  "menu",
  "quantity",
  "unit_price",
  "addons",
  "addons_unit_total",
  "line_total",
  "customer_note",
] as const;

export interface SharedLineCells {
  menu_id: number;
  menu: string;
  quantity: number;
  unit_price: number;
  /** Add-on names joined with " + "; "" when none. */
  addons: string;
  /** Σ add-on snapshot prices for ONE unit; 0 when none. */
  addons_unit_total: number;
  /** (unit_price + addons_unit_total) × quantity — orderTotals.lineTotal. */
  line_total: number;
  customer_note: string | null;
}

export const LINE_HEADERS = [
  "line_id",
  "bill_id",
  "bill_number",
  "paid_date",
  "paid_time",
  "channel",
  "table",
  "order_number",
  "round_no",
  ...SHARED_LINE_HEADERS,
] as const;

export interface LineRow extends SharedLineCells {
  line_id: number;
  bill_id: number;
  bill_number: string;
  /** "YYYY-MM-DD", shop day. */
  paid_date: string;
  /** "HH:mm", shop clock. */
  paid_time: string;
  channel: "Table" | "Counter";
  /** The table's name, or "Counter". */
  table: string;
  order_number: string;
  /** 1, 2, … within the bill, by round creation order. */
  round_no: number;
}

export const CANCELLED_LINE_HEADERS = [
  "line_id",
  "order_number",
  "channel",
  "table",
  "status",
  "reason",
  "cancel_note",
  "submitted_date",
  "submitted_time",
  "decided_time",
  "wait_seconds",
  ...SHARED_LINE_HEADERS,
] as const;

export interface CancelledLineRow extends SharedLineCells {
  line_id: number;
  order_number: string;
  channel: "Table" | "Counter";
  table: string;
  status: "Rejected" | "Timed out";
  /** The reject reason's label; null for a timeout or no record. */
  reason: string | null;
  /** The cashier's note — Other only; null otherwise. */
  cancel_note: string | null;
  /** From the OrderCancellation row (shop clock); null without one. */
  submitted_date: string | null;
  submitted_time: string | null;
  decided_time: string | null;
  /** cancellation.waitSeconds; null without a row. */
  wait_seconds: number | null;
}

// ── Builders ────────────────────────────────────────────────────────────

/** THE shared line columns — the one definition both builders use. */
export function sharedLineCells(line: ExportLine): SharedLineCells {
  const addonUnitPrices = line.addons.map((addon) => addon.unitPrice);
  return {
    menu_id: line.menuId,
    menu: line.menuName,
    quantity: line.quantity,
    unit_price: line.unitPrice,
    addons: line.addons.map((addon) => addon.name).join(" + "),
    addons_unit_total: addonUnitPrices.reduce((sum, price) => sum + price, 0),
    line_total: lineTotal(line.unitPrice, addonUnitPrices, line.quantity),
    customer_note: line.note,
  };
}

/** "sales-lines_2026-10.csv" / "sales-cancelled_2026-10.csv" for a
 *  month; "sales-lines_2026-09-28_week.csv" (the week's start day) for a
 *  week. ASCII only. */
export function exportFileName(
  kind: "lines" | "cancelled",
  period: ReportPeriod,
): string {
  return period.kind === "month"
    ? `sales-${kind}_${period.startDay.slice(0, 7)}.csv`
    : `sales-${kind}_${period.startDay}_week.csv`;
}

const channelLabel = (channel: "table" | "counter") =>
  channel === "table" ? "Table" : "Counter";

const tableLabel = (channel: "table" | "counter", tableName: string | null) =>
  channel === "counter" ? "Counter" : (tableName ?? "");

/** Order numbers compared as people read them (#A99 before #A100). */
const compareOrderNumbers = (a: string, b: string) =>
  a.localeCompare(b, "en", { numeric: true });

/** Rows paired with the instant they sort by, then sorted: time, order
 *  number, line id. */
function sortRows<Row extends { order_number: string; line_id: number }>(
  entries: { time: Date; row: Row }[],
): Row[] {
  return entries
    .sort(
      (a, b) =>
        a.time.getTime() - b.time.getTime() ||
        compareOrderNumbers(a.row.order_number, b.row.order_number) ||
        a.row.line_id - b.row.line_id,
    )
    .map((entry) => entry.row);
}

/** One row per PAID order line, by paid time, then order number, then
 *  line id. */
export function buildLineRows(bills: readonly ExportBill[]): LineRow[] {
  return sortRows(
    bills.flatMap((bill) => {
      const rounds = [...bill.rounds].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      return rounds.flatMap((round, index) =>
        round.lines.map((line) => ({
          time: bill.paidAt,
          row: {
            line_id: line.id,
            bill_id: bill.id,
            bill_number: bill.billNumber,
            paid_date: toShopDay(bill.paidAt),
            paid_time: toShopTime(bill.paidAt),
            channel: channelLabel(bill.channel),
            table: tableLabel(bill.channel, bill.tableName),
            order_number: round.orderNumber,
            round_no: index + 1,
            ...sharedLineCells(line),
          } satisfies LineRow,
        })),
      );
    }),
  );
}

/** One row per non-archived line of each REJECTED or EXPIRED round
 *  (UNSUBMITTED ignored), by decided time (cancel time without a row),
 *  then order number, then line id. A round with no cancellation row
 *  keeps every detail column empty — never guessed. */
export function buildCancelledLineRows(
  rounds: readonly ExportCancelledRound[],
): CancelledLineRow[] {
  return sortRows(
    rounds.flatMap((round) => {
      if (round.cancelReason === "UNSUBMITTED") return [];
      const record = round.cancellation;
      const isRejected = round.cancelReason === "REJECTED";
      const rejectReason = isRejected ? (record?.rejectReason ?? null) : null;
      return round.lines
        .filter((line) => !line.isArchived)
        .map((line) => ({
          time: record?.decidedAt ?? round.cancelledAt,
          row: {
            line_id: line.id,
            order_number: round.orderNumber,
            channel: channelLabel(round.channel),
            table: tableLabel(round.channel, round.tableName),
            status: isRejected ? "Rejected" : "Timed out",
            reason: rejectReason ? rejectReasonLabel(rejectReason) : null,
            cancel_note: rejectReason === "OTHER" ? (record?.note ?? null) : null,
            submitted_date: record ? toShopDay(record.requestedAt) : null,
            submitted_time: record ? toShopTime(record.requestedAt) : null,
            decided_time: record ? toShopTime(record.decidedAt) : null,
            wait_seconds: record
              ? waitSeconds(record.requestedAt, record.decidedAt)
              : null,
            ...sharedLineCells(line),
          } satisfies CancelledLineRow,
        }));
    }),
  );
}

// ── CSV ─────────────────────────────────────────────────────────────────

/** The CSV columns for a header list: numbers through csvNumber, text
 *  (and empty cells) through csvText — so every text cell is guarded. */
function columnsFor<Row>(
  headers: readonly (keyof Row & string)[],
): CsvColumn<Row>[] {
  return headers.map((header) => ({
    header,
    get: (row: Row) => {
      const value = row[header];
      return typeof value === "number"
        ? csvNumber(value)
        : csvText(value as string | null);
    },
  }));
}

const LINE_COLUMNS = columnsFor<LineRow>(LINE_HEADERS);
const CANCELLED_LINE_COLUMNS = columnsFor<CancelledLineRow>(CANCELLED_LINE_HEADERS);

/** The lines file: LINE_HEADERS in order. */
export function linesCsv(rows: readonly LineRow[]): string {
  return toCsv(LINE_COLUMNS, rows);
}

/** The cancelled-lines file: CANCELLED_LINE_HEADERS in order. */
export function cancelledLinesCsv(rows: readonly CancelledLineRow[]): string {
  return toCsv(CANCELLED_LINE_COLUMNS, rows);
}
