"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
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
import {
  hoverCapableMedia,
  visuallyHiddenSx,
  reducedMotionMedia,
} from "@/app/lib/theme/sharedThemeTokens";

const TICK_MS = 1000;
/** From here on, the Counter's calm nudge to go to the counter. */
const HINT_FROM_SECONDS = 120;

/** What the countdown says right now — ticking once a second from the
 *  SERVER's numbers (monotonic timer) — plus the screen-reader
 *  announcements (5, 2 and 1 minutes left, and a Table round's "taking
 *  longer" once — never every second), written straight into
 *  `liveRef`'s live region. */
function useCountdown(
  approval: ApprovalTiming,
  liveRef: React.RefObject<HTMLDivElement | null>,
) {
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
  }, [seconds, approval.autoCancels, t, liveRef]);

  // "Sent 3 minutes ago" in the customer's language — worked out from
  // the seconds alone (only their difference matters), not the phone's
  // clock.
  const sentAgo = isJustSent(secondsSinceSent)
    ? t("sentJustNow")
    : t("sentAgo", {
        ago: format.relativeTime(new Date(0), new Date(secondsSinceSent * 1000)),
      });
  const remaining = remainingLabel(seconds);
  const remainingText =
    remaining.key === "checking" ? t("checking") : t(remaining.key, remaining.values);
  // The deadline on the shop's clock (next-intl's timeZone), in the
  // customer's language.
  const deadlineTime = format.dateTime(new Date(approval.expiresAt), {
    hour: "numeric",
    minute: "2-digit",
  });

  return {
    copy,
    seconds,
    fraction,
    isOverdue,
    sentAgo,
    remainingText,
    deadlineTime,
    /** What the collapsed row shows beside the status. */
    rowTime: isOverdue ? sentAgo : remainingText,
  };
}

type CountdownState = ReturnType<typeof useCountdown>;

/** The expanded part of the countdown: the slim bar (or, past a Table
 *  round's target, the "taking longer" line), the deadline and the
 *  Counter's calm hint. */
function CountdownDetails({
  countdown,
  orderNumber,
}: {
  countdown: CountdownState;
  orderNumber: string;
}) {
  const t = useTranslations("approval");
  const { copy, seconds, fraction, isOverdue, sentAgo, remainingText, deadlineTime } =
    countdown;

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
                  [reducedMotionMedia]: {
                    transition: "none",
                  },
                }}
              />
            </Box>
            <Typography
              variant="body2"
              sx={{ flexShrink: 0, fontVariantNumeric: "tabular-nums" }}
            >
              {remainingText}
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
    </>
  );
}

/** The collapsed row's time — ticking, so only this re-renders each
 *  second while the details are closed. */
function CountdownRowTime({ countdown }: { countdown: CountdownState }) {
  return (
    <Typography
      variant="body2"
      component="span"
      color="text.secondary"
      noWrap
      sx={{ flexShrink: 1, minWidth: 0, maxWidth: "45%", fontVariantNumeric: "tabular-nums" }}
    >
      {countdown.rowTime}
    </Typography>
  );
}

/** The panel's ticking parts — the row's time, and (when open) the
 *  details — under ONE timer. */
function Countdown({
  approval,
  orderNumber,
  liveRef,
  render,
}: {
  approval: ApprovalTiming;
  orderNumber: string;
  liveRef: React.RefObject<HTMLDivElement | null>;
  render: (parts: { rowTime: ReactNode; details: ReactNode }) => ReactNode;
}) {
  const countdown = useCountdown(approval, liveRef);
  return render({
    rowTime: <CountdownRowTime countdown={countdown} />,
    details: <CountdownDetails countdown={countdown} orderNumber={orderNumber} />,
  });
}

/**
 * The cart page while a round waits for approval — Counter and Table
 * alike. ONE compact row by default, so the ordered lines right under it
 * stay on screen: a status icon, the short status ("Waiting for the
 * counter"), the time left and a chevron. Tapping the row opens the full
 * explanation — the title, the order number, the countdown bar, the
 * deadline, the hint — and the customer's own Change / Cancel buttons;
 * tapping again closes it. Closed, the details stay mounted (hidden), so
 * a running Change / Cancel keeps its state; the screen-reader
 * announcements play either way.
 *
 * Timing (from the SERVER's clock, counted down with a monotonic timer):
 * Counter (approval.autoCancels): the round cancels itself at the
 * deadline; at 0 it reads "Checking with the counter…" until the next
 * poll moves it on (accepted → confirmed; expired → "didn't confirm in
 * time"). Table: the window is only a soft target — at 0 the bar gives
 * way to "Taking a little longer than usual…" and how long ago it was
 * sent; nothing is ever cancelled. No deadline (unexpected) → just the
 * plain waiting text. Never red: it reassures (warning text icon + words
 * — never colour alone). The words live in waitingCopy.
 */
export default function ApprovalWaitingPanel({
  orderNumber,
  approval,
  children,
}: {
  orderNumber: string;
  approval: ApprovalTiming | null;
  /** In the opened details, under the countdown — the customer's own
   *  Change / Cancel buttons (WithdrawRoundControls). */
  children?: React.ReactNode;
}) {
  const statusId = useId();
  const detailsId = useId();
  const [open, setOpen] = useState(false);
  const liveRef = useRef<HTMLDivElement | null>(null);
  // Without timing, the plain Counter wording (the only case that can
  // lack one).
  const t = useTranslations("approval");
  const tCommon = useTranslations("common");
  const copy = waitingCopy(approval?.autoCancels ?? true);

  function layout({ rowTime, details }: { rowTime: ReactNode; details: ReactNode }) {
    return (
      <>
        <Typography component="h2" sx={{ m: 0 }}>
          <ButtonBase
            aria-expanded={open}
            aria-controls={detailsId}
            onClick={() => setOpen((value) => !value)}
            sx={(theme) => ({
              width: "100%",
              minHeight: 56,
              px: 2,
              py: 1,
              gap: 1.5,
              justifyContent: "flex-start",
              textAlign: "start",
              borderRadius: 3,
              "&.Mui-focusVisible": {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: -2,
              },
              [hoverCapableMedia]: {
                "&:hover": { bgcolor: theme.palette.action.hover },
              },
            })}
          >
            <HourglassTopRoundedIcon
              aria-hidden
              sx={{ color: "warningText", flexShrink: 0 }}
            />
            <Typography
              id={statusId}
              variant="body1"
              component="span"
              noWrap
              sx={{ flex: 1, minWidth: 0, fontWeight: 600 }}
            >
              {t(copy.short)}
            </Typography>
            {rowTime}
            <ExpandMoreRoundedIcon
              aria-hidden
              sx={{
                flexShrink: 0,
                color: "text.secondary",
                transform: open ? "rotate(180deg)" : "none",
                transition: "transform 160ms ease-out",
              }}
            />
          </ButtonBase>
        </Typography>

        {/* No height animation — it just opens below the row. */}
        <Box id={detailsId} hidden={!open} sx={{ px: 2, pb: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {t(copy.title)}
          </Typography>
          <Typography variant="body1" sx={{ mt: 0.5 }}>
            {tCommon("orderNumber", { number: orderNumber })}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("subtitle")}
          </Typography>
          {details}
          {children}
        </Box>
      </>
    );
  }

  return (
    <Box
      component="section"
      aria-labelledby={statusId}
      sx={{
        position: "relative",
        mb: 1.5,
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
      }}
    >
      {approval ? (
        <Countdown
          approval={approval}
          orderNumber={orderNumber}
          liveRef={liveRef}
          render={layout}
        />
      ) : (
        layout({ rowTime: null, details: null })
      )}
      <Box ref={liveRef} role="status" aria-live="polite" sx={visuallyHiddenSx} />
    </Box>
  );
}
