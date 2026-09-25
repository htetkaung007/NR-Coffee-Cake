"use client";

import { useSyncExternalStore } from "react";
import { Typography } from "@mui/material";

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
  /** ISO timestamp the approval window closes (OrderSession.
   *  approvalExpiresAt). */
  expiresAt: string;
}

/**
 * "m:ss left" until a Counter order's approval window closes (it
 * auto-cancels then). At zero it reads "Expiring…" — the Order List's
 * next auto-refresh drops the entry.
 */
export default function ApprovalCountdown({ expiresAt }: ApprovalCountdownProps) {
  const now = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  let label = "--:-- left";
  if (now !== null) {
    const secondsLeft = Math.max(
      0,
      Math.ceil((new Date(expiresAt).getTime() - now) / 1000),
    );
    label = secondsLeft === 0 ? "Expiring…" : `${formatRemaining(secondsLeft)} left`;
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
