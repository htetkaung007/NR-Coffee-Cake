import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { config } from "../utils/config";

dayjs.extend(utc);
dayjs.extend(timezone);

const SHOP_DAY_FORMAT = "YYYY-MM-DD";

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
