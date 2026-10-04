import { percentOf } from "./percent";
import type { ReportPeriod } from "./reportPeriod";
import { toShopDay } from "./shopDay";

/** One PAID bill, as the sales report reads it (Bill.paidAt, Bill.total —
 *  money counts only once a bill is paid). `channel` is where the order
 *  came from: a table's QR or the counter. */
export interface ReportBill {
  paidAt: Date;
  total: number;
  channel: "table" | "counter";
}

export interface SalesSummary {
  sales: number;
  bills: number;
  /** Whole kyats, rounded; 0 when there are no bills. */
  avgBill: number;
}

export interface DailySales {
  /** Shop day, "YYYY-MM-DD". */
  day: string;
  sales: number;
  bills: number;
}

export interface ChannelSplit {
  table: { sales: number; bills: number };
  counter: { sales: number; bills: number };
  /** Whole percents of sales; add up to exactly 100, or both 0 when
   *  nothing was sold. */
  tableShare: number;
  counterShare: number;
}

const sumOf = (bills: readonly Pick<ReportBill, "total">[]) =>
  bills.reduce((sum, bill) => sum + bill.total, 0);

export function summarizeBills(
  bills: readonly Pick<ReportBill, "total">[],
): SalesSummary {
  const sales = sumOf(bills);
  const count = bills.length;
  return {
    sales,
    bills: count,
    avgBill: count === 0 ? 0 : Math.round(sales / count),
  };
}

/** One entry per day of the period, in order — days with no bills
 *  included, as zeros — each bill on the SHOP day of its paidAt. A bill
 *  outside the period is left out. */
export function buildDailySeries(
  period: ReportPeriod,
  bills: readonly ReportBill[],
): DailySales[] {
  const byDay = new Map<string, DailySales>(
    period.days.map((day) => [day, { day, sales: 0, bills: 0 }]),
  );
  for (const bill of bills) {
    const entry = byDay.get(toShopDay(bill.paidAt));
    if (!entry) continue;
    entry.sales += bill.total;
    entry.bills += 1;
  }
  return period.days.map((day) => byDay.get(day)!);
}

/** How much `current` is up (+) or down (−) on `previous`, in percent
 *  rounded to one decimal; null when there is nothing to compare with
 *  (previous is 0 or missing). Never -0. */
export function percentChange(
  current: number,
  previous: number | null | undefined,
): number | null {
  if (!previous) return null;
  return percentOf(current - previous, previous, 1);
}

export function splitByChannel(bills: readonly ReportBill[]): ChannelSplit {
  const ofChannel = (channel: ReportBill["channel"]) => {
    const own = bills.filter((bill) => bill.channel === channel);
    return { sales: sumOf(own), bills: own.length };
  };
  const table = ofChannel("table");
  const counter = ofChannel("counter");
  const total = table.sales + counter.sales;
  // The counter's share is what's left of 100, so the two always add up
  // exactly (rounding both could give 101).
  const tableShare = percentOf(table.sales, total);
  return {
    table,
    counter,
    tableShare,
    counterShare: total === 0 ? 0 : 100 - tableShare,
  };
}
