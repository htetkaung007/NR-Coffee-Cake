"use client";

import CalendarNavigator from "@/app/components/CalendarNavigator";
import { addDays } from "@/app/lib/shopDay";
import { formatDayLabel } from "./historyFormat";

interface DayNavigatorProps {
  day: string;
  minDay: string;
  maxDay: string;
  today: string;
  shopTimezone: string;
  /** Navigates to a new day — the parent turns this into a URL change
   *  (Rule 17: view state lives in the URL). */
  onNavigate: (day: string) => void;
  /** For the prev/next arrows, which are real links (prefetchable),
   *  not just click handlers — the calendar pick still has to be
   *  imperative (DateCalendar has no link mode). */
  buildHref: (day: string) => string;
}

/** [<] "Today" / "Fri, Sep 25" [>] — the label opens a Popover with a
 *  full calendar (DESIGN.md Rule 24). Arrows disable at the day range's
 *  edges (minDay/maxDay, which history/page.tsx reads on the server). */
export default function DayNavigator({
  day,
  minDay,
  maxDay,
  today,
  shopTimezone,
  onNavigate,
  buildHref,
}: DayNavigatorProps) {
  const prevDay = addDays(day, -1);
  const nextDay = addDays(day, 1);
  const { primary, secondary } = formatDayLabel(day, today);

  return (
    <CalendarNavigator
      primary={primary}
      secondary={secondary}
      prevLabel="Previous day"
      nextLabel="Next day"
      prevHref={prevDay >= minDay ? buildHref(prevDay) : null}
      nextHref={nextDay <= maxDay ? buildHref(nextDay) : null}
      selectedDay={day}
      minDay={minDay}
      maxDay={maxDay}
      shopTimezone={shopTimezone}
      onPickDay={onNavigate}
    />
  );
}
