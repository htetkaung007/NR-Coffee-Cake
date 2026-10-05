import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { config } from "../utils/config";

dayjs.extend(utc);
dayjs.extend(timezone);

const SHOP_DAY_FORMAT = "YYYY-MM-DD";
const SHOP_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** "What day is it for the shop right now" — the shop's own wall-clock
 *  day (config.shopTimezone), never the server's local time or a plain
 *  UTC day, since a late-night order past UTC midnight would otherwise
 *  land on the wrong day in reports. The History page's default day
 *  and its "can't pick a future day" upper bound both come from this. */
export function todayInShop(): string {
  return dayjs().tz(config.shopTimezone).format(SHOP_DAY_FORMAT);
}

/** A timestamp (Bill.paidAt, OrderSession.updateTime, etc.) as the shop
 *  would read it on its own wall-clock calendar — the one place "which
 *  shop-day did this happen on" is decided. */
export function toShopDay(date: Date): string {
  return dayjs(date).tz(config.shopTimezone).format(SHOP_DAY_FORMAT);
}

/** [start, end) as UTC instants for one shop calendar day ("YYYY-MM-DD"):
 *  start is 00:00 of that day IN THE SHOP'S TIMEZONE, end is the next
 *  day's 00:00 — so a paidAt/updateTime column (always stored in UTC)
 *  can be range-checked with a plain `>= start AND < end` (half-open)
 *  without a query site ever having to reason about timezones itself. */
export function dayRangeUtc(day: string): { start: Date; end: Date } {
  const start = dayjs.tz(day, config.shopTimezone);
  return {
    start: start.utc().toDate(),
    end: start.add(1, "day").utc().toDate(),
  };
}

/** A shop day ("YYYY-MM-DD") `n` calendar days later (earlier when n is
 *  negative). Plain calendar arithmetic on the date itself — shop days
 *  are calendar dates, so no timezone or clock is involved, and month
 *  and year ends, leap days included, roll over correctly. */
export function addDays(day: string, n: number): string {
  return dayjs.utc(day).add(n, "day").format(SHOP_DAY_FORMAT);
}

/** Rejects calendar days that don't actually exist (e.g. "2026-02-30")
 *  — plain Date parsing silently rolls those over to a real day
 *  instead of failing, so the check has to compare the parsed
 *  components back against what was typed. Assumes the "YYYY-MM-DD"
 *  shape (see isShopDay for the whole check). */
export function isRealCalendarDay(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Is this text a shop day — "YYYY-MM-DD" AND a date that exists? */
export function isShopDay(value: string): boolean {
  return SHOP_DAY_PATTERN.test(value) && isRealCalendarDay(value);
}

/** "Oct 5, 2026, 3:04 PM" — an instant on the SHOP's clock, whatever the
 *  server's or viewer's own timezone (e.g. a printed report's
 *  "Generated" time). */
export function formatShopDateTime(date: Date): string {
  return dayjs(date).tz(config.shopTimezone).format("MMM D, YYYY, h:mm A");
}

/** "15:04" — an instant's time of day on the SHOP's clock, 24-hour (the
 *  CSV exports' time columns, beside toShopDay's date). */
export function toShopTime(date: Date): string {
  return dayjs(date).tz(config.shopTimezone).format("HH:mm");
}
