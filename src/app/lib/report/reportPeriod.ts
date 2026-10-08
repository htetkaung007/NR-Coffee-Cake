import { addDays, dayRangeUtc } from "../shopDay";

/** The two spans a Backoffice report can cover. */
export type ReportPeriodKind = "week" | "month";

/** One report period, in shop days ("YYYY-MM-DD", see shopDay.ts).
 *  A week runs Monday–Sunday; a month is a calendar month. `days` lists
 *  every day, in order, `endDay` is the LAST day (inclusive). */
export interface ReportPeriod {
  kind: ReportPeriodKind;
  startDay: string;
  endDay: string;
  days: string[];
}

/** English month names — fixed, so a label never depends on the device's
 *  language. */
export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** 0 = Sunday … 6 = Saturday — read off the calendar date itself, so no
 *  timezone is involved. */
function weekdayOf(day: string) {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

function daysInMonth(day: string) {
  const [year, month] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** `count` consecutive days from `startDay`. */
function daysFrom(startDay: string, count: number) {
  return Array.from({ length: count }, (_, index) => addDays(startDay, index));
}

function buildPeriod(
  kind: ReportPeriodKind,
  startDay: string,
  length: number,
): ReportPeriod {
  const days = daysFrom(startDay, length);
  return { kind, startDay, endDay: days[days.length - 1], days };
}

/** The period of `kind` that contains `anchorDay`. */
export function periodFor(
  kind: ReportPeriodKind,
  anchorDay: string,
): ReportPeriod {
  if (kind === "week") {
    const sinceMonday = (weekdayOf(anchorDay) + 6) % 7;
    return buildPeriod("week", addDays(anchorDay, -sinceMonday), 7);
  }
  return buildPeriod("month", `${anchorDay.slice(0, 7)}-01`, daysInMonth(anchorDay));
}

/** The period of the same kind just before this one. */
export function previousPeriod(period: ReportPeriod): ReportPeriod {
  const dayBefore = addDays(period.startDay, -1);
  return periodFor(period.kind, dayBefore);
}

/** The period of the same kind just after this one. */
export function nextPeriod(period: ReportPeriod): ReportPeriod {
  const dayAfter = addDays(period.endDay, 1);
  return periodFor(period.kind, dayAfter);
}

/** Is `today` (a shop day) inside the period? */
export function isCurrentPeriod(period: ReportPeriod, today: string): boolean {
  return today >= period.startDay && today <= period.endDay;
}

/** How many of the period's days have happened by `today`, today
 *  included — capped at the period's length, 0 before it starts. For
 *  comparing a running period fairly with a finished one. */
export function elapsedDays(period: ReportPeriod, today: string): number {
  return period.days.filter((day) => day <= today).length;
}

/** The period cut down to its first `count` days (at least 1, at most
 *  all) — to compare a period that is still running with the same number
 *  of days of the one before it. */
export function firstDays(period: ReportPeriod, count: number): ReportPeriod {
  const days = period.days.slice(0, Math.min(Math.max(count, 1), period.days.length));
  return { ...period, days, endDay: days[days.length - 1] };
}

/** "Sep 28" — month name abbreviated, no year. */
function shortDayLabel(day: string) {
  const [, month, dayOfMonth] = day.split("-").map(Number);
  return `${MONTH_NAMES[month - 1].slice(0, 3)} ${dayOfMonth}`;
}

/** "Sep 28 – Oct 4, 2026" for a week, "September 2026" for a month. English
 *  month names whatever the device's language (fixed names, not Intl). */
export function periodLabel(period: ReportPeriod): string {
  const startYear = period.startDay.slice(0, 4);
  const endYear = period.endDay.slice(0, 4);
  if (period.kind === "month") {
    const month = Number(period.startDay.slice(5, 7));
    return `${MONTH_NAMES[month - 1]} ${startYear}`;
  }
  const start = shortDayLabel(period.startDay);
  const end = shortDayLabel(period.endDay);
  return startYear === endYear
    ? `${start} – ${end}, ${endYear}`
    : `${start}, ${startYear} – ${end}, ${endYear}`;
}

/** [start, end) as UTC instants — from the first day's shop-midnight to
 *  the last day's end (see dayRangeUtc), for a plain `>= start AND < end`
 *  check on Bill.paidAt. */
export function periodRangeUtc(period: ReportPeriod): {
  start: Date;
  end: Date;
} {
  return {
    start: dayRangeUtc(period.startDay).start,
    end: dayRangeUtc(period.endDay).end,
  };
}
