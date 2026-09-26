import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { formatClockTime } from "@/app/lib/orderFormat";

dayjs.extend(utc);
dayjs.extend(timezone);

/** Every "day" string here is already a shop-calendar day ("YYYY-MM-DD",
 *  computed by shopDay.ts) — parsed with dayjs.utc purely to read its
 *  calendar parts (weekday, month, day-of-month) without any further
 *  timezone conversion, never to re-derive "which day" something was. */

/** "Today" / "Yesterday" / a weekday name for line 1, "Fri, Sep 25" for
 *  line 2 (always shown, whatever line 1 says) — the day navigator's
 *  label. `today` is the shop's current day (todayInShop()). */
export function formatDayLabel(day: string, today: string) {
  const yesterday = dayjs.utc(today).subtract(1, "day").format("YYYY-MM-DD");
  const primary =
    day === today
      ? "Today"
      : day === yesterday
        ? "Yesterday"
        : dayjs.utc(day).format("ddd");
  return { primary, secondary: dayjs.utc(day).format("ddd, MMM D") };
}

/** "11:20 AM – 12:05 PM" — a paid bill's opened-to-paid span. */
export function formatTimeRange(startIso: string, endIso: string) {
  return `${formatClockTime(startIso)} – ${formatClockTime(endIso)}`;
}

/** "45 min" between two ISO timestamps — never negative (clock skew
 *  between reads is the only way it could go below zero). */
export function formatDurationMinutes(startIso: string, endIso: string) {
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
    ),
  );
  return `${minutes} min`;
}

/** "Rejected" / "Timed out" — the only two reasons this page ever shows
 *  (see OrderHistoryService's own REJECTED/EXPIRED-only scope). */
export function formatCancelReasonLabel(reason: string) {
  return reason === "REJECTED" ? "Rejected" : "Timed out";
}

/** "Fri, Sep 25" for an absolute timestamp, read on the SHOP's calendar
 *  (never the viewer's own timezone) — the detail view's date line.
 *  Unlike the other helpers here, this one does need a live timezone
 *  conversion (the input is a real instant, not an already-resolved
 *  shop-day string), so it takes shopTimezone explicitly. */
export function formatShopDateLabel(iso: string, shopTimezone: string) {
  return dayjs(iso).tz(shopTimezone).format("ddd, MMM D");
}
