import { describe, it, expect } from "vitest";
import { dayRangeUtc, toShopDay } from "./shopDay";

// Shop timezone is Asia/Yangon (UTC+06:30) — pinned in vitest.config.ts.
const HOUR_MS = 60 * 60 * 1000;

describe("toShopDay", () => {
  it("dates a moment by the shop's calendar, not the UTC calendar", () => {
    // 05:00 on 25 Sep in Yangon is still 24 Sep in UTC.
    const fiveAmYangon = new Date("2026-09-24T22:30:00Z");
    expect(toShopDay(fiveAmYangon)).toBe("2026-09-25");
  });

  it("puts a moment one minute before shop midnight on the earlier day", () => {
    expect(toShopDay(new Date("2026-09-25T17:29:00Z"))).toBe("2026-09-25");
  });
});

describe("dayRangeUtc", () => {
  it("starts the day at 00:00 shop time", () => {
    expect(dayRangeUtc("2026-09-25").start).toEqual(
      new Date("2026-09-24T17:30:00Z"),
    );
  });

  it("ends one day exactly where the next day starts", () => {
    expect(dayRangeUtc("2026-09-25").end).toEqual(
      dayRangeUtc("2026-09-26").start,
    );
  });

  it("spans exactly 24 hours", () => {
    const { start, end } = dayRangeUtc("2026-09-25");
    expect(end.getTime() - start.getTime()).toBe(24 * HOUR_MS);
  });

  it("agrees with toShopDay on which day its start belongs to", () => {
    expect(toShopDay(dayRangeUtc("2026-09-25").start)).toBe("2026-09-25");
  });
});
