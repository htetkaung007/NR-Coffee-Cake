import { beforeEach, describe, it, expect } from "vitest";
import {
  elapsedDays,
  firstDays,
  isCurrentPeriod,
  nextPeriod,
  periodFor,
  periodLabel,
  periodRangeUtc,
  previousPeriod,
  type ReportPeriod,
  type ReportPeriodKind,
} from "./reportPeriod";
import { dayRangeUtc, toShopDay } from "../shopDay";

// Shop timezone is Asia/Yangon (UTC+06:30, no daylight saving) — pinned in
// vitest.config.mts. 2026-09-28 is a Monday, 2026-10-04 the Sunday after.
const DAY_MS = 24 * 60 * 60 * 1000;

/** A moment as read on a Yangon wall clock. */
const yangon = (day: string, time: string) => new Date(`${day}T${time}:00+06:30`);

describe("periodFor — week", () => {
  it("runs from Monday to Sunday around a mid-week day", () => {
    const week = periodFor("week", "2026-09-30");
    expect(week.startDay).toBe("2026-09-28");
    expect(week.endDay).toBe("2026-10-04");
  });

  it("keeps a Monday anchor as the first day of its own week", () => {
    expect(periodFor("week", "2026-09-28").startDay).toBe("2026-09-28");
  });

  it("ends the week on the anchor when the anchor is a Sunday", () => {
    const week = periodFor("week", "2026-10-04");
    expect(week.endDay).toBe("2026-10-04");
    expect(week.startDay).toBe("2026-09-28");
  });

  it("lists all seven days in order", () => {
    expect(periodFor("week", "2026-09-30").days).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
    ]);
  });

  it("carries its kind", () => {
    expect(periodFor("week", "2026-09-30").kind).toBe("week");
  });

  it("can cross a month boundary", () => {
    const week = periodFor("week", "2026-10-01");
    expect(week.startDay).toBe("2026-09-28");
    expect(week.endDay).toBe("2026-10-04");
  });

  it("can cross a year boundary", () => {
    const week = periodFor("week", "2027-01-01");
    expect(week.startDay).toBe("2026-12-28");
    expect(week.endDay).toBe("2027-01-03");
    expect(week.days).toHaveLength(7);
  });
});

describe("periodFor — month", () => {
  it("runs from the first to the last day of the anchor's month", () => {
    const month = periodFor("month", "2026-09-15");
    expect(month.startDay).toBe("2026-09-01");
    expect(month.endDay).toBe("2026-09-30");
  });

  it("carries its kind", () => {
    expect(periodFor("month", "2026-09-15").kind).toBe("month");
  });

  it.each([
    ["a 31-day month", "2026-10-10", 31, "2026-10-31"],
    ["a 30-day month", "2026-09-10", 30, "2026-09-30"],
    ["December, the year's last month", "2026-12-31", 31, "2026-12-31"],
    ["February in a non-leap year", "2027-02-14", 28, "2027-02-28"],
    ["February in a leap year", "2028-02-14", 29, "2028-02-29"],
  ])("has the right length for %s", (_name, anchor, length, lastDay) => {
    const month = periodFor("month", anchor);
    expect(month.days).toHaveLength(length);
    expect(month.endDay).toBe(lastDay);
  });

  it("lists every day of the month in order, first to last", () => {
    const { days } = periodFor("month", "2028-02-10");
    expect(days[0]).toBe("2028-02-01");
    expect(days[1]).toBe("2028-02-02");
    expect(days[days.length - 1]).toBe("2028-02-29");
  });

  it("gives the same month for the first, a middle and the last day of it", () => {
    const first = periodFor("month", "2026-10-01");
    expect(periodFor("month", "2026-10-17")).toEqual(first);
    expect(periodFor("month", "2026-10-31")).toEqual(first);
  });
});

describe("previousPeriod", () => {
  it("steps a week back to the Monday–Sunday before it", () => {
    const previous = previousPeriod(periodFor("week", "2026-09-30"));
    expect(previous.startDay).toBe("2026-09-21");
    expect(previous.endDay).toBe("2026-09-27");
  });

  it("steps back from a week that starts on 29 December", () => {
    const previous = previousPeriod(periodFor("week", "2025-12-29"));
    expect(previous.startDay).toBe("2025-12-22");
    expect(previous.endDay).toBe("2025-12-28");
  });

  it("steps back into a week that crosses the year end", () => {
    // 5 Jan 2026 is a Monday; the week before it holds 1 January.
    const previous = previousPeriod(periodFor("week", "2026-01-05"));
    expect(previous.startDay).toBe("2025-12-29");
    expect(previous.endDay).toBe("2026-01-04");
  });

  it("steps a month back to the whole month before it", () => {
    const previous = previousPeriod(periodFor("month", "2026-10-15"));
    expect(previous.startDay).toBe("2026-09-01");
    expect(previous.endDay).toBe("2026-09-30");
  });

  it("gives February (28 days) before 1 March in a non-leap year", () => {
    const previous = previousPeriod(periodFor("month", "2026-03-01"));
    expect(previous.startDay).toBe("2026-02-01");
    expect(previous.endDay).toBe("2026-02-28");
  });

  it("gives February (29 days) before 1 March in a leap year", () => {
    const previous = previousPeriod(periodFor("month", "2028-03-01"));
    expect(previous.endDay).toBe("2028-02-29");
    expect(previous.days).toHaveLength(29);
  });

  it("steps back from January into December of the year before", () => {
    const previous = previousPeriod(periodFor("month", "2027-01-10"));
    expect(previous.startDay).toBe("2026-12-01");
    expect(previous.endDay).toBe("2026-12-31");
  });

  it("keeps the kind", () => {
    expect(previousPeriod(periodFor("week", "2026-09-30")).kind).toBe("week");
    expect(previousPeriod(periodFor("month", "2026-09-30")).kind).toBe("month");
  });
});

describe("nextPeriod", () => {
  it("steps a week forward to the Monday–Sunday after it", () => {
    const next = nextPeriod(periodFor("week", "2026-09-30"));
    expect(next.startDay).toBe("2026-10-05");
    expect(next.endDay).toBe("2026-10-11");
  });

  it("steps a month forward to the whole month after it", () => {
    const next = nextPeriod(periodFor("month", "2026-09-15"));
    expect(next.startDay).toBe("2026-10-01");
    expect(next.endDay).toBe("2026-10-31");
  });

  it("steps forward from December into January of the next year", () => {
    const next = nextPeriod(periodFor("month", "2026-12-20"));
    expect(next.startDay).toBe("2027-01-01");
  });

  it("steps forward into a leap-year February", () => {
    const next = nextPeriod(periodFor("month", "2028-01-20"));
    expect(next.endDay).toBe("2028-02-29");
  });

  it.each<[ReportPeriodKind, string]>([
    ["week", "2026-09-28"],
    ["week", "2025-12-29"],
    ["week", "2026-12-28"],
    ["month", "2026-03-15"],
    ["month", "2027-01-10"],
    ["month", "2028-02-29"],
    ["month", "2026-12-31"],
  ])("is the inverse of previousPeriod (%s around %s)", (kind, anchor) => {
    const period = periodFor(kind, anchor);
    expect(nextPeriod(previousPeriod(period))).toEqual(period);
    expect(previousPeriod(nextPeriod(period))).toEqual(period);
  });
});

describe("isCurrentPeriod", () => {
  let week: ReportPeriod; // Sep 28 – Oct 4
  beforeEach(() => {
    week = periodFor("week", "2026-09-30");
  });

  it.each(["2026-09-28", "2026-09-30", "2026-10-04"])(
    "is true when today (%s) is a day of the period",
    (today) => {
      expect(isCurrentPeriod(week, today)).toBe(true);
    },
  );

  it("is false for the period before", () => {
    expect(isCurrentPeriod(previousPeriod(week), "2026-09-30")).toBe(false);
  });

  it("is false for the period after", () => {
    expect(isCurrentPeriod(nextPeriod(week), "2026-09-30")).toBe(false);
  });

  it("works for a month", () => {
    const month = periodFor("month", "2026-09-10");
    expect(isCurrentPeriod(month, "2026-09-30")).toBe(true);
    expect(isCurrentPeriod(month, "2026-10-01")).toBe(false);
  });
});

describe("elapsedDays", () => {
  let week: ReportPeriod; // Mon Sep 28 – Sun Oct 4
  beforeEach(() => {
    week = periodFor("week", "2026-09-30");
  });

  it("counts the days so far, today included, in the middle of a period", () => {
    expect(elapsedDays(week, "2026-09-30")).toBe(3); // Mon, Tue, Wed
  });

  it("is 1 on the first day", () => {
    expect(elapsedDays(week, "2026-09-28")).toBe(1);
  });

  it("is the whole length on the last day", () => {
    expect(elapsedDays(week, "2026-10-04")).toBe(7);
  });

  it("is capped at the period's length once it is over", () => {
    expect(elapsedDays(week, "2026-10-20")).toBe(7);
  });

  it("is 0 for a period that hasn't started yet", () => {
    expect(elapsedDays(week, "2026-09-27")).toBe(0);
  });

  it("works for a month", () => {
    const month = periodFor("month", "2026-09-10");
    expect(elapsedDays(month, "2026-09-12")).toBe(12);
    expect(elapsedDays(month, "2026-11-01")).toBe(30);
  });
});

describe("periodLabel", () => {
  it("writes a week that crosses a month as 'Sep 28 – Oct 4, 2026'", () => {
    expect(periodLabel(periodFor("week", "2026-09-30"))).toBe(
      "Sep 28 – Oct 4, 2026",
    );
  });

  it("writes a month as its name and year", () => {
    expect(periodLabel(periodFor("month", "2026-09-10"))).toBe("September 2026");
  });

  it("writes a week inside one month with both ends named", () => {
    expect(periodLabel(periodFor("week", "2026-09-23"))).toBe(
      "Sep 21 – Sep 27, 2026",
    );
  });

  it("gives each end its year when a week crosses a year", () => {
    expect(periodLabel(periodFor("week", "2027-01-01"))).toBe(
      "Dec 28, 2026 – Jan 3, 2027",
    );
  });

  it("names every month in English", () => {
    expect(periodLabel(periodFor("month", "2027-02-10"))).toBe("February 2027");
    expect(periodLabel(periodFor("month", "2026-12-10"))).toBe("December 2026");
  });
});

describe("periodRangeUtc", () => {
  let week: ReportPeriod; // Mon Sep 28 – Sun Oct 4
  beforeEach(() => {
    week = periodFor("week", "2026-09-30");
  });

  it("starts at 00:00 shop time on the first day", () => {
    expect(periodRangeUtc(week).start).toEqual(
      new Date("2026-09-27T17:30:00Z"),
    );
  });

  it("is built from the shop-day boundaries of its first and last day", () => {
    const range = periodRangeUtc(week);
    expect(range.start).toEqual(dayRangeUtc(week.startDay).start);
    expect(range.end).toEqual(dayRangeUtc(week.endDay).end);
  });

  it("ends exactly where the next week begins", () => {
    expect(periodRangeUtc(week).end).toEqual(periodRangeUtc(nextPeriod(week)).start);
  });

  it("ends exactly where the next month begins", () => {
    const month = periodFor("month", "2026-09-10");
    expect(periodRangeUtc(month).end).toEqual(
      periodRangeUtc(nextPeriod(month)).start,
    );
  });

  it("spans exactly seven days for a week", () => {
    const { start, end } = periodRangeUtc(week);
    expect(end.getTime() - start.getTime()).toBe(7 * DAY_MS);
  });

  it("spans exactly 29 days for February in a leap year", () => {
    const { start, end } = periodRangeUtc(periodFor("month", "2028-02-10"));
    expect(end.getTime() - start.getTime()).toBe(29 * DAY_MS);
  });

  it("includes a bill paid at 05:00 shop time on the first day, which is still the day before in UTC", () => {
    const paidAt = yangon("2026-09-28", "05:00");
    const { start, end } = periodRangeUtc(week);
    expect(toShopDay(paidAt)).toBe("2026-09-28");
    expect(paidAt >= start && paidAt < end).toBe(true);
  });

  it("keeps that 05:00 bill out of the week before", () => {
    const paidAt = yangon("2026-09-28", "05:00");
    const { start, end } = periodRangeUtc(previousPeriod(week));
    expect(paidAt >= start && paidAt < end).toBe(false);
  });

  it("includes 23:59 on the last day and excludes 00:01 on the day after", () => {
    const { start, end } = periodRangeUtc(week);
    const lateSunday = yangon("2026-10-04", "23:59");
    const earlyMonday = yangon("2026-10-05", "00:01");
    expect(lateSunday >= start && lateSunday < end).toBe(true);
    expect(earlyMonday >= start && earlyMonday < end).toBe(false);
  });
});

describe("firstDays", () => {
  it("cuts a period down to its first days", () => {
    const week = firstDays(periodFor("week", "2026-09-30"), 3);
    expect(week.days).toEqual(["2026-09-28", "2026-09-29", "2026-09-30"]);
    expect(week.startDay).toBe("2026-09-28");
    expect(week.endDay).toBe("2026-09-30");
  });

  it("keeps the kind", () => {
    expect(firstDays(periodFor("month", "2026-09-10"), 5).kind).toBe("month");
  });

  it("gives the whole period when asked for more days than it has", () => {
    const week = periodFor("week", "2026-09-30");
    expect(firstDays(week, 99)).toEqual(week);
  });

  it("never gives less than one day", () => {
    expect(firstDays(periodFor("week", "2026-09-30"), 0).days).toEqual(["2026-09-28"]);
  });

  it("gives a range that ends where the cut-off day ends", () => {
    const cut = firstDays(periodFor("week", "2026-09-30"), 2);
    expect(periodRangeUtc(cut).end).toEqual(dayRangeUtc("2026-09-29").end);
  });
});
