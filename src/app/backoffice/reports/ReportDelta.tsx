"use client";

import { Box, Typography } from "@mui/material";
import { formatDelta } from "@/app/lib/reportView";
import type { ReportPeriodKind } from "@/app/lib/reportPeriod";
import { visuallyHiddenSx } from "@/app/lib/theme/sharedThemeTokens";

/** A change on the previous period: "▲ 12% vs last week" — an arrow AND
 *  words, never colour alone (DESIGN.md Rule 13) — or "—" when there is
 *  nothing to compare with (the first period ever). `compact` drops the
 *  "vs last week" for a table row, whose column header says it. A screen
 *  reader gets the same thing in words ("Up 12% vs last week"). */
export default function ReportDelta({
  percent,
  kind,
  compact = false,
}: {
  percent: number | null;
  kind: ReportPeriodKind;
  compact?: boolean;
}) {
  const delta = formatDelta(percent, kind);
  const visible = compact
    ? delta.direction === "none"
      ? "—"
      : `${delta.arrow} ${delta.amount}`
    : delta.label;

  return (
    <Typography
      component="span"
      variant="body2"
      color="text.secondary"
      sx={{ whiteSpace: "nowrap" }}
    >
      <Box component="span" aria-hidden>
        {visible}
      </Box>
      <Box component="span" sx={visuallyHiddenSx}>
        {delta.spoken}
      </Box>
    </Typography>
  );
}
