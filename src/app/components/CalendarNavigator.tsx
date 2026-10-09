"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  ButtonBase,
  IconButton,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { isPlainLeftClick } from "@/app/lib/isPlainLeftClick";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

dayjs.extend(utc);
dayjs.extend(timezone);

const DAY_FORMAT = "YYYY-MM-DD";

interface CalendarNavigatorProps {
  /** The label button's first line (and only line, without `secondary`). */
  primary: string;
  secondary?: string;
  prevLabel: string;
  nextLabel: string;
  /** Where the arrows lead — real links (prefetchable); null disables the
   *  arrow (nothing before / after). */
  prevHref: string | null;
  nextHref: string | null;
  /** The day the calendar opens on and marks. */
  selectedDay: string;
  /** Earliest / latest pickable day; no minDay = no lower bound. */
  minDay?: string;
  maxDay: string;
  shopTimezone: string;
  /** A day picked in the calendar — the parent turns it into a URL
   *  change (DESIGN.md Rule 17: view state lives in the URL). */
  onPickDay: (day: string) => void;
  /** Given, a plain click on an arrow calls this with its href instead of
   *  following the link itself — so the parent can navigate inside a
   *  transition and know when it's pending. Modified clicks (new tab)
   *  still go through the link. */
  onNavigate?: (href: string) => void;
}

/** [<] label [>] — the label opens a Popover with a full calendar
 *  (DESIGN.md Rule 24). Shared by Order History's DayNavigator (one day
 *  at a time) and the Reports' period navigator (a week or month). */
export default function CalendarNavigator({
  primary,
  secondary,
  prevLabel,
  nextLabel,
  prevHref,
  nextHref,
  selectedDay,
  minDay,
  maxDay,
  shopTimezone,
  onPickDay,
  onNavigate,
}: CalendarNavigatorProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const selected = dayjs.tz(selectedDay, shopTimezone);
  const min = minDay ? dayjs.tz(minDay, shopTimezone) : undefined;
  const max = dayjs.tz(maxDay, shopTimezone);

  function arrowProps(href: string | null) {
    if (!href) return {};
    return {
      component: Link,
      href,
      onClick: (event: MouseEvent<HTMLElement>) => {
        if (onNavigate && isPlainLeftClick(event)) {
          event.preventDefault();
          onNavigate(href);
        }
      },
    };
  }

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      <IconButton
        aria-label={prevLabel}
        disabled={!prevHref}
        sx={{ width: 44, height: 44 }}
        {...arrowProps(prevHref)}
      >
        <ChevronLeftIcon />
      </IconButton>

      <ButtonBase
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchorEl)}
        sx={(theme) => ({
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          minWidth: 96,
          px: 1.5,
          py: 0.5,
          borderRadius: 1.5,
          color: "inherit",
          font: "inherit",
          transition: "background-color 160ms ease-out",
          [hoverCapableMedia]: {
            "&:hover": { backgroundColor: theme.palette.action.hover },
          },
          // Visible keyboard focus, as SegmentedTabs.
          "&.Mui-focusVisible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        })}
      >
        <Typography variant="body1" sx={{ lineHeight: 1.2 }}>
          {primary}
        </Typography>
        {secondary && (
          <Typography variant="body2" color="text.secondary">
            {secondary}
          </Typography>
        )}
      </ButtonBase>

      <IconButton
        aria-label={nextLabel}
        disabled={!nextHref}
        sx={{ width: 44, height: 44 }}
        {...arrowProps(nextHref)}
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
            onPickDay(value.format(DAY_FORMAT));
          }}
        />
      </Popover>
    </Stack>
  );
}
