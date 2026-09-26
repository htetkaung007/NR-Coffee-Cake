"use client";

import { useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { Box, IconButton, Popover, Stack, Typography } from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { formatDayLabel } from "./historyFormat";

dayjs.extend(utc);
dayjs.extend(timezone);

const DAY_FORMAT = "YYYY-MM-DD";

function shiftDay(day: string, deltaDays: number) {
  return dayjs.utc(day).add(deltaDays, "day").format(DAY_FORMAT);
}

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
   *  not just click handlers — the calendar pick below still has to be
   *  imperative (DateCalendar has no link mode). */
  buildHref: (day: string) => string;
}

/** [<] "Today" / "Fri, Sep 25" [>] — the label opens a Popover with a
 *  full calendar (DESIGN.md Rule 24). Arrows disable at the day range's
 *  edges (minDay/maxDay from getHistoryBoundsAction). */
export default function DayNavigator({
  day,
  minDay,
  maxDay,
  today,
  shopTimezone,
  onNavigate,
  buildHref,
}: DayNavigatorProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const prevDay = shiftDay(day, -1);
  const nextDay = shiftDay(day, 1);
  const canGoPrev = prevDay >= minDay;
  const canGoNext = nextDay <= maxDay;
  const { primary, secondary } = formatDayLabel(day, today);

  const selected = dayjs.tz(day, shopTimezone);
  const min = dayjs.tz(minDay, shopTimezone);
  const max = dayjs.tz(maxDay, shopTimezone);

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <IconButton
        aria-label="Previous day"
        disabled={!canGoPrev}
        sx={{ width: 44, height: 44 }}
        {...(canGoPrev
          ? { component: Link, href: buildHref(prevDay) }
          : {})}
      >
        <ChevronLeftIcon />
      </IconButton>

      <Box
        component="button"
        type="button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={(theme) => ({
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          minWidth: 96,
          px: 1.5,
          py: 0.5,
          border: "none",
          borderRadius: 1.5,
          bgcolor: "transparent",
          color: "inherit",
          font: "inherit",
          cursor: "pointer",
          transition: "background-color 160ms ease-out",
          [hoverCapableMedia]: {
            "&:hover": { backgroundColor: theme.palette.action.hover },
          },
        })}
      >
        <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {primary}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {secondary}
        </Typography>
      </Box>

      <IconButton
        aria-label="Next day"
        disabled={!canGoNext}
        sx={{ width: 44, height: 44 }}
        {...(canGoNext
          ? { component: Link, href: buildHref(nextDay) }
          : {})}
      >
        <ChevronRightIcon />
      </IconButton>

      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <DateCalendar
          value={selected}
          minDate={min}
          maxDate={max}
          timezone={shopTimezone}
          views={["year", "month", "day"]}
          openTo="day"
          onChange={(value) => {
            if (!value) return;
            setAnchorEl(null);
            onNavigate(value.format(DAY_FORMAT));
          }}
        />
      </Popover>
    </Stack>
  );
}
