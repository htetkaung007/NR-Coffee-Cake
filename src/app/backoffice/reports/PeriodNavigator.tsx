"use client";

import CalendarNavigator from "@/app/components/CalendarNavigator";
import type { ReportPeriod } from "@/app/lib/reportPeriod";
import { periodLabel } from "@/app/lib/reportPeriod";
import {
  navigationDays,
  reportHref,
  type ReportParams,
} from "@/app/lib/reportView";

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
  const { prevDay, nextDay } = navigationDays(period, today);
  const hrefFor = (day: string) => reportHref({ ...params, day });

  return (
    <CalendarNavigator
      primary={periodLabel(period)}
      prevLabel={`Previous ${period.kind}`}
      nextLabel={`Next ${period.kind}`}
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
