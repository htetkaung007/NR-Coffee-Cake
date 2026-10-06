"use client";

import { useSyncExternalStore } from "react";
import { Typography } from "@mui/material";
import { remainingSeconds } from "@/app/lib/approvalCountdown";

// One shared 1-second clock for every countdown on the page instead of
// an interval per card. The interval only exists while at least one
// countdown is mounted; the last one to unmount clears it.
const TICK_MS = 1000;
const listeners = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;
let nowMs: number | null = null;

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Give the first client render after mount a real time right away
  // rather than waiting a full second on the placeholder.
  nowMs = Date.now();
  if (intervalId === null) {
    intervalId = setInterval(() => {
      nowMs = Date.now();
      listeners.forEach((notify) => notify());
    }, TICK_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  };
}

const getSnapshot = () => nowMs;
// Server render (and hydration) never knows the time — always the
// placeholder, so server and client markup match.
const getServerSnapshot = () => null;

function formatRemaining(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

interface ApprovalCountdownProps {
  /** ISO time the most urgent round is due (approvalDeadline). */
  expiresAt: string;
  /** Counter: the round cancels itself then ("Expiring…"). Table: it
   *  only becomes overdue — "Overdue m:ss", counting up. */
  autoCancels: boolean;
}

/**
 * "m:ss left" until the most urgent round awaiting approval is due. At
 * zero a Counter round reads "Expiring…" (it auto-cancels — the Order
 * List's next auto-refresh drops the entry); a Table round, which is
 * never cancelled, reads "Overdue m:ss" counting up, so the cashier
 * notices it. Same shared clock either way; the warning tone comes from
 * the "Needs approval" row it sits in.
 */
export default function ApprovalCountdown({
  expiresAt,
  autoCancels,
}: ApprovalCountdownProps) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let label = "--:-- left";
  if (now !== null) {
    // The one definition of "time left" (rounded up, never below 0) —
    // here measured straight against the deadline, nothing elapsed yet.
    const secondsToDeadline = (new Date(expiresAt).getTime() - now) / 1000;
    const secondsLeft = remainingSeconds(secondsToDeadline, 0);
    if (secondsLeft > 0) {
      label = `${formatRemaining(secondsLeft)} left`;
    } else if (autoCancels) {
      label = "Expiring…";
    } else {
      // Whole seconds past the deadline, counting up from 0:00.
      label = `Overdue ${formatRemaining(Math.max(0, Math.floor(-secondsToDeadline)))}`;
    }
  }

  return (
    <Typography
      component="span"
      variant="body2"
      sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
    >
      {label}
    </Typography>
  );
}
