"use client";

import { useEffect, useRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import {
  announcementFor,
  progressFraction,
  remainingLabel,
  remainingSeconds,
} from "@/app/lib/approvalCountdown";
import type { ApprovalTiming } from "@/app/lib/approvalTiming";
import { useMonotonicElapsed } from "@/app/lib/hooks/useMonotonicElapsed";
import { visuallyHiddenSx } from "@/app/lib/theme/sharedThemeTokens";

const TICK_MS = 1000;
/** From here on, a calm nudge to go to the counter. */
const HINT_FROM_SECONDS = 120;

/** The ticking part only — the bar, the time left, the hint and the
 *  screen-reader announcements — so the once-a-second update re-renders
 *  nothing else on the page. */
function Countdown({
  approval,
  orderNumber,
}: {
  approval: ApprovalTiming;
  orderNumber: string;
}) {
  const elapsedMs = useMonotonicElapsed(approval, TICK_MS);
  const seconds = remainingSeconds(approval.secondsRemaining, elapsedMs);
  const fraction = progressFraction(seconds, approval.windowSeconds);

  // Screen readers hear 5, 2 and 1 minutes left — never every second.
  // Written straight into the live region (no re-render).
  const liveRef = useRef<HTMLDivElement | null>(null);
  const previousSeconds = useRef<number | null>(null);
  useEffect(() => {
    const message = announcementFor(previousSeconds.current, seconds);
    previousSeconds.current = seconds;
    if (message && liveRef.current) liveRef.current.textContent = message;
  }, [seconds]);

  return (
    <>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mt: 2 }}>
        {/* A slim bar that only ever shrinks — scaleX, no pulsing. */}
        <Box
          aria-hidden
          sx={{
            flex: 1,
            height: 6,
            borderRadius: 3,
            overflow: "hidden",
            bgcolor: "action.hover",
          }}
        >
          <Box
            sx={{
              height: "100%",
              bgcolor: "primary.main",
              transformOrigin: "left",
              transform: `scaleX(${fraction})`,
              transition: `transform ${TICK_MS}ms linear`,
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            }}
          />
        </Box>
        <Typography
          variant="body2"
          sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
        >
          {remainingLabel(seconds)}
        </Typography>
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        If it isn&apos;t confirmed by {approval.deadlineTime}, it will be
        cancelled automatically — you won&apos;t be charged.
      </Typography>

      {seconds > 0 && seconds <= HINT_FROM_SECONDS && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          Still waiting? Show order {orderNumber} at the counter.
        </Typography>
      )}

      <Box
        ref={liveRef}
        role="status"
        aria-live="polite"
        sx={visuallyHiddenSx}
      />
    </>
  );
}

/**
 * The Counter cart page while the counter decides: what's happening, the
 * order number to show at the counter, and — calmly — how long the
 * counter has left to confirm (the window from the SERVER's clock,
 * counted down with a monotonic timer). At 0 it reads "Checking with the
 * counter…" until the next poll moves the round on (accepted → the
 * confirmed screen; expired → "didn't confirm in time"). No deadline
 * (unexpected) → just the plain waiting text. Never red: it reassures.
 */
export default function CounterWaitingPanel({
  orderNumber,
  approval,
}: {
  orderNumber: string;
  approval: ApprovalTiming | null;
}) {
  return (
    <Box
      component="section"
      aria-labelledby="counter-waiting-title"
      sx={{
        position: "relative",
        mb: 2,
        p: 2,
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    >
      <Typography id="counter-waiting-title" variant="h6" component="h2">
        Waiting for the counter to confirm
      </Typography>
      <Typography variant="body1" sx={{ mt: 0.5 }}>
        Order {orderNumber}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Usually confirmed within a few minutes.
      </Typography>
      {approval && <Countdown approval={approval} orderNumber={orderNumber} />}
    </Box>
  );
}
