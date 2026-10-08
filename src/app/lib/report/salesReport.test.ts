import { describe, it, expect } from "vitest";
import {
  buildDailySeries,
  percentChange,
  splitByChannel,
  summarizeBills,
  type ReportBill,
} from "./salesReport";
import type { ReportPeriod } from "./reportPeriod";

// Shop timezone is Asia/Yangon (UTC+06:30) — pinned in vitest.config.mts.
// Periods are written out by hand so these tests don't depend on
// reportPeriod.ts.

const WEEK: ReportPeriod = {
  kind: "week",
  startDay: "2026-09-28",
  endDay: "2026-10-04",
  days: [
    "2026-09-28",
    "2026-09-29",
    "2026-09-30",
    "2026-10-01",
    "2026-10-02",
    "2026-10-03",
    "2026-10-04",
  ],
};

/** `count` consecutive days from `startDay`. */
function daysFrom(startDay: string, count: number) {
  const first = Date.parse(`${startDay}T00:00:00Z`);
  return Array.from({ length: count }, (_, i) =>
    new Date(first + i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  );
}

const SEPTEMBER: ReportPeriod = {
  kind: "month",
  startDay: "2026-09-01",
  endDay: "2026-09-30",
  days: daysFrom("2026-09-01", 30),
};

/** A paid bill, its paidAt read on a Yangon wall clock. */
function bill(
  day: string,
  time: string,
  total: number,
  channel: ReportBill["channel"] = "counter",
): ReportBill {
  return { paidAt: new Date(`${day}T${time}:00+06:30`), total, channel };
}

describe("summarizeBills", () => {
  const bills = [
    bill("2026-09-28", "10:00", 3000),
    bill("2026-09-29", "11:00", 4500),
    bill("2026-09-30", "12:00", 2500),
  ];

  it("adds up the sales", () => {
    expect(summarizeBills(bills).sales).toBe(10000);
  });

  it("counts the bills", () => {
    expect(summarizeBills(bills).bills).toBe(3);
  });

  it("averages a bill to a whole number", () => {
    expect(summarizeBills(bills).avgBill).toBe(3333); // 10,000 / 3 = 3,333.3
  });

  it("rounds the average up from .67", () => {
    const list = [
      bill("2026-09-28", "10:00", 1000),
      bill("2026-09-28", "11:00", 1000),
      bill("2026-09-28", "12:00", 1500),
    ];
    expect(summarizeBills(list).avgBill).toBe(1167); // 1,166.67
  });

  it("rounds a half up", () => {
    const list = [bill("2026-09-28", "10:00", 1000), bill("2026-09-28", "11:00", 1001)];
    expect(summarizeBills(list).avgBill).toBe(1001); // 1,000.5
  });

  it("is all zeros when there are no bills", () => {
    expect(summarizeBills([])).toEqual({ sales: 0, bills: 0, avgBill: 0 });
  });
});

describe("buildDailySeries", () => {
  it("has one entry per day of the period, in order", () => {
    const series = buildDailySeries(WEEK, [bill("2026-09-30", "10:00", 2000)]);
    expect(series.map((entry) => entry.day)).toEqual(WEEK.days);
  });

  it("keeps the days with no bills, as zeros", () => {
    const series = buildDailySeries(WEEK, [
      bill("2026-09-28", "10:00", 2000),
      bill("2026-09-30", "10:00", 3000),
    ]);
    expect(series[1]).toEqual({ day: "2026-09-29", sales: 0, bills: 0 });
    expect(series[3]).toEqual({ day: "2026-10-01", sales: 0, bills: 0 });
  });

  it("adds up several bills paid on the same day", () => {
    const series = buildDailySeries(WEEK, [
      bill("2026-09-29", "09:00", 2000),
      bill("2026-09-29", "13:30", 1500),
      bill("2026-09-29", "20:15", 500),
    ]);
    expect(series[1]).toEqual({ day: "2026-09-29", sales: 4000, bills: 3 });
  });

  it("puts 23:59 and 00:01 shop time on different days", () => {
    // Both are 28 Sep in UTC (17:29Z and 17:31Z) — only shop midnight, at
    // 17:30Z, separates them.
    const series = buildDailySeries(WEEK, [
      bill("2026-09-28", "23:59", 1000),
      bill("2026-09-29", "00:01", 2000),
    ]);
    expect(series[0]).toEqual({ day: "2026-09-28", sales: 1000, bills: 1 });
    expect(series[1]).toEqual({ day: "2026-09-29", sales: 2000, bills: 1 });
  });

  it("dates a bill paid at 05:00 shop time by the shop day, not the UTC day", () => {
    // 05:00 on 28 Sep in Yangon is 22:30 on 27 Sep in UTC.
    const series = buildDailySeries(WEEK, [bill("2026-09-28", "05:00", 1800)]);
    expect(series[0]).toEqual({ day: "2026-09-28", sales: 1800, bills: 1 });
  });

  it("leaves out a bill paid outside the period", () => {
    const series = buildDailySeries(WEEK, [
      bill("2026-09-27", "23:59", 9999),
      bill("2026-10-05", "00:01", 9999),
    ]);
    expect(series.every((entry) => entry.sales === 0 && entry.bills === 0)).toBe(
      true,
    );
    expect(series).toHaveLength(7);
  });

  it("is all zero days for an empty list of bills", () => {
    const series = buildDailySeries(SEPTEMBER, []);
    expect(series).toHaveLength(30);
    expect(series.every((entry) => entry.sales === 0 && entry.bills === 0)).toBe(
      true,
    );
  });

  it("has one entry per day of a month", () => {
    const series = buildDailySeries(SEPTEMBER, [bill("2026-09-30", "10:00", 700)]);
    expect(series).toHaveLength(30);
    expect(series[29]).toEqual({ day: "2026-09-30", sales: 700, bills: 1 });
  });
});

describe("percentChange", () => {
  it("is null when the previous period had no sales", () => {
    expect(percentChange(5000, 0)).toBeNull();
  });

  it("is null when there is no previous value", () => {
    expect(percentChange(5000, undefined)).toBeNull();
    expect(percentChange(5000, null)).toBeNull();
  });

  it("is positive for an increase", () => {
    expect(percentChange(150, 100)).toBe(50);
  });

  it("is negative for a decrease", () => {
    expect(percentChange(75, 100)).toBe(-25);
  });

  it("is 0 when nothing changed", () => {
    expect(percentChange(100, 100)).toBe(0);
  });

  it("is -100 when sales fell to nothing", () => {
    expect(percentChange(0, 100)).toBe(-100);
  });

  it("rounds to one decimal", () => {
    expect(percentChange(200, 300)).toBe(-33.3); // -33.33…
    expect(percentChange(301, 300)).toBe(0.3); // 0.33…
    expect(percentChange(250, 300)).toBe(-16.7); // -16.66…
  });

  it("shows a change too small to round as 0, never -0", () => {
    // -0.01% rounds to zero; toBe uses Object.is, which tells -0 from 0.
    expect(percentChange(9999, 10000)).toBe(0);
  });
});

describe("splitByChannel", () => {
  const bills = [
    bill("2026-09-28", "10:00", 1000, "table"),
    bill("2026-09-28", "11:00", 1000, "table"),
    bill("2026-09-29", "12:00", 2000, "counter"),
    bill("2026-09-30", "13:00", 2000, "counter"),
    bill("2026-09-30", "14:00", 2000, "counter"),
  ];

  it("totals the sales and bills of each channel", () => {
    const split = splitByChannel(bills);
    expect(split.table).toEqual({ sales: 2000, bills: 2 });
    expect(split.counter).toEqual({ sales: 6000, bills: 3 });
  });

  it("gives each channel its whole-percent share of the sales", () => {
    const split = splitByChannel(bills);
    expect(split.tableShare).toBe(25);
    expect(split.counterShare).toBe(75);
  });

  it("bases the shares on sales, not on the number of bills", () => {
    const split = splitByChannel([
      bill("2026-09-28", "10:00", 9000, "table"),
      bill("2026-09-28", "11:00", 500, "counter"),
      bill("2026-09-28", "12:00", 500, "counter"),
    ]);
    expect(split.tableShare).toBe(90);
    expect(split.counterShare).toBe(10);
  });

  it("makes the shares add up to 100 when they don't divide evenly", () => {
    const split = splitByChannel([
      bill("2026-09-28", "10:00", 1000, "table"),
      bill("2026-09-28", "11:00", 2000, "counter"),
    ]);
    expect(split.tableShare + split.counterShare).toBe(100); // 33.3 / 66.7
  });

  it("still adds up to 100 when both shares would round up (12.5 / 87.5)", () => {
    const split = splitByChannel([
      bill("2026-09-28", "10:00", 125, "table"),
      bill("2026-09-28", "11:00", 875, "counter"),
    ]);
    expect(split.tableShare + split.counterShare).toBe(100);
    expect(Math.abs(split.tableShare - 12.5)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(split.counterShare - 87.5)).toBeLessThanOrEqual(0.5);
  });

  it("gives a channel with no bills zero sales, zero bills and a 0 share", () => {
    const split = splitByChannel([bill("2026-09-28", "10:00", 4000, "counter")]);
    expect(split.table).toEqual({ sales: 0, bills: 0 });
    expect(split.tableShare).toBe(0);
    expect(split.counterShare).toBe(100);
  });

  it("is zeros and 0 / 0 shares when there are no bills", () => {
    expect(splitByChannel([])).toEqual({
      table: { sales: 0, bills: 0 },
      counter: { sales: 0, bills: 0 },
      tableShare: 0,
      counterShare: 0,
    });
  });
});
