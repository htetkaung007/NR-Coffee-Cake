import type { ReportPeriod, ReportPeriodKind } from "./reportPeriod";

/**
 * Every word the Reports page and the printable report put around their
 * figures, in the staff's language — built ONCE from the bo.reports
 * messages (templates, so each language keeps its own word order), the
 * month / weekday names of the language (next-intl's formatter) and the
 * staff's money words. Digits stay 0–9 in both languages. The pure
 * helpers (reportView) only arrange them. Pure.
 */

/** The bo.reports keys this builder reads. */
type ReportWordKey =
  | "comparisonWeek"
  | "comparisonMonth"
  | "deltaLabel"
  | "spokenUp"
  | "spokenDown"
  | "spokenFlat"
  | "noComparison"
  | "reportDay"
  | "dayMonth"
  | "monthDay"
  | "monthDayYear"
  | "monthYear"
  | "weekRange"
  | "weekRangeYears"
  | "barLabel"
  | "barLabelToday"
  | "bills"
  | "weekProgress"
  | "monthProgress"
  | "monthInProgress"
  | "weeklyTitle"
  | "monthlyTitle";

type ReportTranslator = (
  key: ReportWordKey,
  values?: Record<string, string | number>,
) => string;

/** The language's own names (Intl), by number: month 1–12, weekday
 *  0 (Sunday) – 6. */
interface DateNames {
  monthLong: (month: number) => string;
  monthShort: (month: number) => string;
  weekdayShort: (weekday: number) => string;
}

/** The names in `locale`, from Intl (fixed UTC dates — a name never
 *  depends on a timezone). */
export function dateNamesFor(locale: string): DateNames {
  const formatter = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, { ...options, timeZone: "UTC" });
  const monthLong = formatter({ month: "long" });
  const monthShort = formatter({ month: "short" });
  const weekdayShort = formatter({ weekday: "short" });
  // 2026-02-01 is a Sunday: + weekday days lands on that weekday.
  return {
    monthLong: (month) => monthLong.format(Date.UTC(2026, month - 1, 1)),
    monthShort: (month) => monthShort.format(Date.UTC(2026, month - 1, 1)),
    weekdayShort: (weekday) => weekdayShort.format(Date.UTC(2026, 1, 1 + weekday)),
  };
}

/** A shop day's parts ("2026-09-28" → 2026, 9, 28, weekday 1). */
function dayParts(day: string) {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  return {
    year,
    month,
    dayOfMonth,
    weekday: new Date(`${day}T00:00:00Z`).getUTCDay(),
  };
}

export function reportWords(
  t: ReportTranslator,
  names: DateNames,
  money: (amount: number) => string,
) {
  const monthDay = (day: string) => {
    const { month, dayOfMonth } = dayParts(day);
    return t("monthDay", { month: names.monthShort(month), day: dayOfMonth });
  };
  const monthDayYear = (day: string) => {
    const { year, month, dayOfMonth } = dayParts(day);
    return t("monthDayYear", { month: names.monthShort(month), day: dayOfMonth, year });
  };

  return {
    money,
    /** "vs last week" / "vs last month". */
    comparison: (kind: ReportPeriodKind) =>
      kind === "week" ? t("comparisonWeek") : t("comparisonMonth"),
    /** "▲ 12% vs last week". */
    deltaLabel: (arrow: string, amount: string, comparison: string) =>
      t("deltaLabel", { arrow, amount, comparison }),
    /** "Up 12% vs last week" … for a screen reader. */
    spoken: (direction: "up" | "down" | "flat", amount: string, comparison: string) =>
      direction === "up"
        ? t("spokenUp", { amount, comparison })
        : direction === "down"
          ? t("spokenDown", { amount, comparison })
          : t("spokenFlat", { comparison }),
    noComparison: t("noComparison"),
    /** "Mon 28 Sep". */
    reportDay: (day: string) => {
      const { month, dayOfMonth, weekday } = dayParts(day);
      return t("reportDay", {
        weekday: names.weekdayShort(weekday),
        day: dayOfMonth,
        month: names.monthShort(month),
      });
    },
    /** "Mon" — a chart axis. */
    weekday: (day: string) => names.weekdayShort(dayParts(day).weekday),
    /** "28 Sep" — the printed daily table's date column. */
    dayMonth: (day: string) => {
      const { month, dayOfMonth } = dayParts(day);
      return t("dayMonth", { day: dayOfMonth, month: names.monthShort(month) });
    },
    /** "Sep 28 – Oct 4, 2026" for a week, "September 2026" for a month. */
    period: (period: ReportPeriod) => {
      const start = dayParts(period.startDay);
      const endYear = dayParts(period.endDay).year;
      if (period.kind === "month") {
        return t("monthYear", { month: names.monthLong(start.month), year: start.year });
      }
      return start.year === endYear
        ? t("weekRange", {
            start: monthDay(period.startDay),
            end: monthDay(period.endDay),
            year: endYear,
          })
        : t("weekRangeYears", {
            start: monthDayYear(period.startDay),
            end: monthDayYear(period.endDay),
          });
    },
    /** "12 bills". */
    bills: (count: number) => t("bills", { count }),
    /** "Mon 28 Sep: 142,000 MMK, 12 bills" (", today"). */
    barLabel: (day: string, sales: number, bills: number, isToday: boolean) => {
      const { month, dayOfMonth, weekday } = dayParts(day);
      const values = {
        day: t("reportDay", {
          weekday: names.weekdayShort(weekday),
          day: dayOfMonth,
          month: names.monthShort(month),
        }),
        sales: money(sales),
        bills: t("bills", { count: bills }),
      };
      return isToday ? t("barLabelToday", values) : t("barLabel", values);
    },
    /** "Week in progress · 4 of 7 days". */
    progress: (kind: ReportPeriodKind, elapsed: number, total: number) =>
      t(kind === "week" ? "weekProgress" : "monthProgress", { elapsed, total }),
    /** "September in progress". */
    monthInProgress: (month: number) =>
      t("monthInProgress", { month: names.monthLong(month) }),
    /** "Weekly report — Sep 28 – Oct 4, 2026". */
    reportTitle: (kind: ReportPeriodKind, period: string) =>
      t(kind === "week" ? "weeklyTitle" : "monthlyTitle", { period }),
  };
}

export type ReportWords = ReturnType<typeof reportWords>;
