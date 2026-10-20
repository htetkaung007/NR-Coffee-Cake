import { useFormatter, useTranslations } from "next-intl";
import { useClockTime } from "@/app/lib/hooks/useStaffWords";
import type { HistoryWords } from "./historyFormat";

/** A shop day ("YYYY-MM-DD") as an instant whose UTC parts are that day —
 *  formatted with timeZone UTC, so it reads as exactly that calendar day. */
const asUtcDay = (day: string) => new Date(`${day}T00:00:00Z`);

/** History's words in the staff's language (historyFormat). */
export function useHistoryWords(): HistoryWords {
  const t = useTranslations("bo.history");
  const tReason = useTranslations("bo.rejectReason");
  const format = useFormatter();
  const clockTime = useClockTime();
  return {
    today: t("today"),
    yesterday: t("yesterday"),
    weekday: (day) => format.dateTime(asUtcDay(day), { weekday: "short", timeZone: "UTC", numberingSystem: "latn" }),
    dayDate: (day) =>
      format.dateTime(asUtcDay(day), {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
        numberingSystem: "latn",
      }),
    shopDate: (iso) =>
      format.dateTime(new Date(iso), { weekday: "short", month: "short", day: "numeric", numberingSystem: "latn" }),
    clockTime,
    minutes: (minutes) => t("minutes", { minutes }),
    cancelReason: (reason) => t(`cancelReason.${reason}`),
    rejectReason: (reason) => tReason(reason),
    rejectedWith: (reason) => t("rejectedWith", { reason }),
    timedOutAfter: (duration) => t("timedOutAfter", { duration }),
    waited: (duration) => t("waited", { duration }),
    durationUnits: {
      seconds: (seconds) => t("durationSeconds", { seconds }),
      minutes: (minutes) => t("durationMinutes", { minutes }),
      minutesSeconds: (minutes, seconds) =>
        t("durationMinutesSeconds", { minutes, seconds }),
      hoursMinutes: (hours, minutes) => t("durationHoursMinutes", { hours, minutes }),
    },
  };
}
