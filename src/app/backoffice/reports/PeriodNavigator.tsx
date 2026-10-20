"use client";

import CalendarNavigator from "@/app/components/CalendarNavigator";
import type { ReportPeriod } from "@/app/lib/report/reportPeriod";
import { useTranslations } from "next-intl";
import { useReportWords } from "./useReportWords";
import {
  navigationDays,
  reportHref,
  type ReportParams,
} from "@/app/lib/report/reportView";

interface PeriodNavigatorProps {
  params: ReportParams;
  period: ReportPeriod;
  today: string;
  shopTimezone: string;
  onNavigate: (href: string) => void;
}

/** [<] Sep 28 – Oct 4, 2026 [>] — the arrows step a whole week or month
 *  (the next one is disabled on the current period); the label opens the
 *  calendar, and picking a day selects the period that contains it. The
 *  same navigator Order History uses for a day (CalendarNavigator). */
export default function PeriodNavigator({
  params,
  period,
  today,
  shopTimezone,
  onNavigate,
}: PeriodNavigatorProps) {
  const t = useTranslations("bo.reports");
  const words = useReportWords();
  const { prevDay, nextDay } = navigationDays(period, today);
  const hrefFor = (day: string) => reportHref({ ...params, day });

  return (
    <CalendarNavigator
      primary={words.period(period)}
      prevLabel={period.kind === "week" ? t("previousWeek") : t("previousMonth")}
      nextLabel={period.kind === "week" ? t("nextWeek") : t("nextMonth")}
      prevHref={hrefFor(prevDay)}
      nextHref={nextDay ? hrefFor(nextDay) : null}
      selectedDay={params.day}
      maxDay={today}
      shopTimezone={shopTimezone}
      onPickDay={(day) => onNavigate(hrefFor(day))}
      onNavigate={onNavigate}
    />
  );
}
