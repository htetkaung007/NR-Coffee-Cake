import {
  formatDuration,
  type CancellationDetail,
  type DurationUnits,
} from "@/app/lib/order/cancellation";
import type { RejectReason } from "@/app/lib/order/rejectReason";

/**
 * History's words, built from the staff's language (useHistoryWords —
 * bo.history and bo.rejectReason in messages/*.json, dates and times
 * through next-intl's formatter in the SHOP timezone). Every helper
 * here only arranges them. Pure.
 *
 * Every "day" string is already a shop-calendar day ("YYYY-MM-DD",
 * computed by shopDay.ts) — its weekday / date are read from its
 * calendar parts, never re-derived from an instant.
 */
export interface HistoryWords {
  today: string;
  yesterday: string;
  /** "Fri" for a shop day. */
  weekday: (day: string) => string;
  /** "Fri, Sep 25" for a shop day. */
  dayDate: (day: string) => string;
  /** "Fri, Sep 25" for an instant, read on the shop's calendar. */
  shopDate: (iso: string) => string;
  /** "11:20 AM" for an instant, in shop time. */
  clockTime: (iso: string) => string;
  /** "45 min". */
  minutes: (minutes: number) => string;
  /** "Rejected" / "Timed out" / "Cancelled by customer". */
  cancelReason: (reason: "REJECTED" | "EXPIRED" | "WITHDRAWN") => string;
  /** The cashier's reason ("Out of stock"). */
  rejectReason: (reason: RejectReason) => string;
  /** "Rejected · Out of stock". */
  rejectedWith: (reason: string) => string;
  /** "Timed out · no decision in 10m". */
  timedOutAfter: (duration: string) => string;
  /** "Waited 4m 20s before it was rejected". */
  waited: (duration: string) => string;
  durationUnits: DurationUnits;
}

/** "Today" / "Yesterday" / a weekday name for line 1, "Fri, Sep 25" for
 *  line 2 (always shown, whatever line 1 says) — the day navigator's
 *  label. `today` is the shop's current day (todayInShop()). */
export function formatDayLabel(day: string, today: string, words: HistoryWords) {
  const primary =
    day === today
      ? words.today
      : day === previousDay(today)
        ? words.yesterday
        : words.weekday(day);
  return { primary, secondary: words.dayDate(day) };
}

/** The calendar day before `day` ("YYYY-MM-DD", UTC parts only). */
function previousDay(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

/** "11:20 AM – 12:05 PM" — a paid bill's opened-to-paid span. */
export function formatTimeRange(
  startIso: string,
  endIso: string,
  words: HistoryWords,
) {
  return `${words.clockTime(startIso)} – ${words.clockTime(endIso)}`;
}

/** "45 min" between two ISO timestamps — never negative (clock skew
 *  between reads is the only way it could go below zero). */
export function formatDurationMinutes(
  startIso: string,
  endIso: string,
  words: HistoryWords,
) {
  const minutes = Math.max(
    0,
    Math.round(
      (new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000,
    ),
  );
  return words.minutes(minutes);
}

/** "Rejected" / "Timed out" / "Cancelled by customer" — the reasons this
 *  page shows (OrderHistoryService's sent-rounds scope) — plus what was
 *  recorded: "Rejected · Out of stock", "Timed out · no decision in 10m".
 *  Without a record it stays the plain label. */
export function formatCancelReasonLabel(
  reason: string,
  cancellation: CancellationDetail | null,
  words: HistoryWords,
) {
  if (reason === "WITHDRAWN") return words.cancelReason("WITHDRAWN");
  if (reason === "REJECTED") {
    return cancellation?.rejectReason
      ? words.rejectedWith(words.rejectReason(cancellation.rejectReason))
      : words.cancelReason("REJECTED");
  }
  return cancellation?.waitSeconds != null
    ? words.timedOutAfter(formatDuration(cancellation.waitSeconds, words.durationUnits))
    : words.cancelReason("EXPIRED");
}

/** "Rejected · Other — coffee machine broken" — the detail view's line
 *  for a rejection for Other that has the cashier's note (shown in full,
 *  as plain text); null otherwise. The list row stays "Rejected · Other". */
export function formatCancelNoteLine(
  reason: string,
  cancellation: CancellationDetail | null,
  words: HistoryWords,
) {
  if (
    reason !== "REJECTED" ||
    cancellation?.rejectReason !== "OTHER" ||
    !cancellation.note
  ) {
    return null;
  }
  return `${formatCancelReasonLabel(reason, cancellation, words)} — ${cancellation.note}`;
}

/** "Waited 4m 20s before it was rejected" — the detail view's line for a
 *  recorded rejection; null otherwise (a timeout's label already says
 *  how long it waited). */
export function formatCancelWait(
  reason: string,
  cancellation: CancellationDetail | null,
  words: HistoryWords,
) {
  if (reason !== "REJECTED" || cancellation?.waitSeconds == null) return null;
  return words.waited(formatDuration(cancellation.waitSeconds, words.durationUnits));
}
