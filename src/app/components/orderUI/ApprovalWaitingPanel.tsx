"use client";

import { useEffect, useId, useRef } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useFormatter, useTranslations } from "next-intl";
import {
  isJustSent,
  progressFraction,
  remainingLabel,
  remainingSeconds,
  waitingAnnouncement,
  waitingCopy,
} from "@/app/lib/approval/approvalCountdown";
import type { ApprovalTiming } from "@/app/lib/approval/approvalTiming";
import { useMonotonicElapsed } from "@/app/lib/hooks/useMonotonicElapsed";
import { visuallyHiddenSx } from "@/app/lib/theme/sharedThemeTokens";

const TICK_MS = 1000;
/** From here on, the Counter's calm nudge to go to the counter. */
const HINT_FROM_SECONDS = 120;

/** The ticking part only — the bar (or, past a Table round's target, the
 *  "taking longer" line), the time left, the hint and the screen-reader
 *  announcements — so the once-a-second update re-renders nothing else
 *  on the page. */
function Countdown({
  approval,
  orderNumber,
}: {
  approval: ApprovalTiming;
  orderNumber: string;
}) {
  const t = useTranslations("approval");
  const format = useFormatter();
  const copy = waitingCopy(approval.autoCancels);
  const elapsedMs = useMonotonicElapsed(approval, TICK_MS);
  const seconds = remainingSeconds(approval.secondsRemaining, elapsedMs);
  const fraction = progressFraction(seconds, approval.windowSeconds);
  // Past a Table round's soft target (a Counter round keeps its bar and
  // "Checking with the counter…" until the next poll moves it on).
  const isOverdue = copy.overdue !== null && seconds === 0;
  // How long ago it was sent, from what the server already said: the
  // window minus the (signed) seconds left, plus the time since.
  const secondsSinceSent =
    approval.windowSeconds -
    approval.secondsRemaining +
    Math.floor(elapsedMs / 1000);

  // Screen readers hear 5, 2 and 1 minutes left, and a Table round's
  // "taking longer" once — never every second. Written straight into the
  // live region (no re-render).
  const liveRef = useRef<HTMLDivElement | null>(null);
  const previousSeconds = useRef<number | null>(null);
  useEffect(() => {
    const announcement = waitingAnnouncement(
      previousSeconds.current,
      seconds,
      approval.autoCancels,
    );
    previousSeconds.current = seconds;
    if (announcement && liveRef.current) {
      liveRef.current.textContent =
        announcement.key === "minutesLeftToConfirm"
          ? t(announcement.key, announcement.values)
          : t(announcement.key);
    }
  }, [seconds, approval.autoCancels, t]);

  // "Sent 3 minutes ago" in the customer's language — worked out from
  // the seconds alone (only their difference matters), not the phone's
  // clock.
  const sentAgo = isJustSent(secondsSinceSent)
    ? t("sentJustNow")
    : t("sentAgo", {
        ago: format.relativeTime(new Date(0), new Date(secondsSinceSent * 1000)),
      });
  const remaining = remainingLabel(seconds);
  // The deadline on the shop's clock (next-intl's timeZone), in the
  // customer's language.
  const deadlineTime = format.dateTime(new Date(approval.expiresAt), {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <>
      {isOverdue ? (
        <Box sx={{ mt: 2 }}>
          {copy.overdue && <Typography variant="body2">{t(copy.overdue)}</Typography>}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {sentAgo}
          </Typography>
        </Box>
      ) : (
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
                  "@media (prefers-reduced-motion: reduce)": {
                    transition: "none",
                  },
                }}
              />
            </Box>
            <Typography
              variant="body2"
              sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
            >
              {remaining.key === "checking"
                ? t("checking")
                : t(remaining.key, remaining.values)}
            </Typography>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t(copy.deadline, { time: deadlineTime })}
          </Typography>
        </>
      )}

      {copy.hint && seconds > 0 && seconds <= HINT_FROM_SECONDS && (
        <Typography variant="body2" sx={{ mt: 1 }}>
          {t(copy.hint, { number: orderNumber })}
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
 * The cart page while a round waits for approval — Counter and Table
 * alike: what's happening, the order number, and — calmly — how long is
 * left (from the SERVER's clock, counted down with a monotonic timer).
 *
 * Counter (approval.autoCancels): the round cancels itself at the
 * deadline; at 0 it reads "Checking with the counter…" until the next
 * poll moves it on (accepted → confirmed; expired → "didn't confirm in
 * time"). Table: the window is only a soft target — at 0 the bar gives
 * way to "Taking a little longer than usual…" and how long ago it was
 * sent; nothing is ever cancelled. No deadline (unexpected) → just the
 * plain waiting text. Never red: it reassures. The words live in
 * waitingCopy.
 */
export default function ApprovalWaitingPanel({
  orderNumber,
  approval,
  children,
}: {
  orderNumber: string;
  approval: ApprovalTiming | null;
  /** Under the countdown — the customer's own Change / Cancel buttons
   *  (WithdrawRoundControls). */
  children?: React.ReactNode;
}) {
  const titleId = useId();
  // Without timing, the plain Counter wording (the only case that can
  // lack one).
  const t = useTranslations("approval");
  const tCommon = useTranslations("common");
  const copy = waitingCopy(approval?.autoCancels ?? true);

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
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
      <Typography id={titleId} variant="h6" component="h2">
        {t(copy.title)}
      </Typography>
      <Typography variant="body1" sx={{ mt: 0.5 }}>
        {tCommon("orderNumber", { number: orderNumber })}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {t("subtitle")}
      </Typography>
      {approval && <Countdown approval={approval} orderNumber={orderNumber} />}
      {children}
    </Box>
  );
}
