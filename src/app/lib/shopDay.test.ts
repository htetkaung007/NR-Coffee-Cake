import { describe, it, expect } from "vitest";
import {
  addDays,
  dayRangeUtc,
  formatShopDateTime,
  toShopTime,
  isShopDay,
  toShopDay,
} from "./shopDay";

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

describe("addDays", () => {
  it("moves a day forward", () => {
    expect(addDays("2026-09-25", 1)).toBe("2026-09-26");
  });

  it("moves a day back when n is negative", () => {
    expect(addDays("2026-09-25", -1)).toBe("2026-09-24");
  });

  it("leaves the day alone for 0", () => {
    expect(addDays("2026-09-25", 0)).toBe("2026-09-25");
  });

  it("rolls over a month end", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
  });

  it("rolls back over a month start", () => {
    expect(addDays("2026-10-01", -1)).toBe("2026-09-30");
  });

  it("rolls over a year end", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("rolls back over a year start", () => {
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
  });

  it("has a 29 February in a leap year", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("skips straight to 1 March in a year that isn't a leap year", () => {
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
  });

  it("moves several weeks at once", () => {
    expect(addDays("2026-09-28", 42)).toBe("2026-11-09");
  });

  it("keeps the zero-padded YYYY-MM-DD form", () => {
    expect(addDays("2026-01-09", 1)).toBe("2026-01-10");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("isShopDay", () => {
  it("accepts a real date in YYYY-MM-DD form", () => {
    expect(isShopDay("2026-09-25")).toBe(true);
  });

  it("accepts 29 February in a leap year", () => {
    expect(isShopDay("2028-02-29")).toBe(true);
  });

  it("rejects a date that doesn't exist", () => {
    expect(isShopDay("2026-02-30")).toBe(false);
    expect(isShopDay("2027-02-29")).toBe(false);
    expect(isShopDay("2026-13-01")).toBe(false);
  });

  it("rejects text that isn't in YYYY-MM-DD form", () => {
    expect(isShopDay("25/09/2026")).toBe(false);
    expect(isShopDay("2026-9-5")).toBe(false);
    expect(isShopDay("")).toBe(false);
    expect(isShopDay("not a day")).toBe(false);
  });
});

describe("formatShopDateTime", () => {
  it("writes an instant on the shop's clock (Asia/Yangon, UTC+6:30)", () => {
    expect(formatShopDateTime(new Date("2026-10-05T08:34:00Z"))).toBe(
      "Oct 5, 2026, 3:04 PM",
    );
  });

  it("rolls over to the shop's next day before UTC does", () => {
    expect(formatShopDateTime(new Date("2026-10-05T18:00:00Z"))).toBe(
      "Oct 6, 2026, 12:30 AM",
    );
  });
});

describe("toShopTime", () => {
  it("writes an instant as HH:mm on the shop's clock (24-hour)", () => {
    expect(toShopTime(new Date("2026-10-05T08:34:00Z"))).toBe("15:04");
  });

  it("writes just after the shop's midnight as 00:01", () => {
    expect(toShopTime(new Date("2026-10-04T17:31:00Z"))).toBe("00:01");
  });
});
