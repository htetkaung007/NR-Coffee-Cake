"use client";

import { Box, Card, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { periodLabel, type ReportPeriod } from "@/app/lib/reportPeriod";
import { navigationDays, pairingMonthCaption } from "@/app/lib/reportView";
import { ErrorRetry } from "./ReportStates";
import type { PairingState } from "./usePairing";
import { sectionHeadingSx } from "../order/orderTypography";

interface PairingSectionProps {
  /** The calendar month shown — its own, not the page's Week / Month. */
  period: ReportPeriod;
  today: string;
  state: PairingState;
  onRetry: () => void;
  /** Move to another month — by any day in it. */
  onChangeDay: (day: string) => void;
}

/** "< September 2026 >" with what it measures. The add-on pairing in the
 *  panels below is always for this one calendar month; the arrows move it
 *  a month at a time (next is disabled on the current month), and it is
 *  independent of the Week | Month control and period navigator at the
 *  top of the page. The panels themselves open under each menu and
 *  add-on; this card carries the month and any loading / error / empty
 *  message for the month as a whole. */
export default function PairingSection({
  period,
  today,
  state,
  onRetry,
  onChangeDay,
}: PairingSectionProps) {
  const { prevDay, nextDay } = navigationDays(period, today);
  const caption = pairingMonthCaption(period, today);

  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        useFlexGap
        sx={{
          gap: 1,
          alignItems: { sm: "center" },
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="body1" component="h2" sx={sectionHeadingSx}>
            Add-on pairing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Pairing is calculated per calendar month
          </Typography>
          {caption && (
            <Typography variant="body2" color="text.secondary">
              {caption}
            </Typography>
          )}
        </Box>

        <Stack
          direction="row"
          role="group"
          aria-label="Pairing month"
          sx={{ alignItems: "center", alignSelf: { xs: "center", sm: "auto" } }}
        >
          <IconButton
            aria-label="Previous month"
            onClick={() => onChangeDay(prevDay)}
            sx={{ width: 44, height: 44 }}
          >
            <ChevronLeftIcon />
          </IconButton>
          <Typography
            variant="body1"
            aria-live="polite"
            sx={{ minWidth: 148, textAlign: "center" }}
          >
            {periodLabel(period)}
          </Typography>
          <IconButton
            aria-label="Next month"
            disabled={nextDay === null}
            onClick={() => nextDay && onChangeDay(nextDay)}
            sx={{ width: 44, height: 44 }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Stack>
      </Stack>

      {state.status === "loading" && (
        <Skeleton variant="text" width="60%" sx={{ mt: 1 }} />
      )}
      {state.status === "error" && (
        <ErrorRetry message={state.message} onRetry={onRetry} dense />
      )}
      {state.status === "ok" && state.data.menus.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No pairing data yet for this month
        </Typography>
      )}
    </Card>
  );
}
