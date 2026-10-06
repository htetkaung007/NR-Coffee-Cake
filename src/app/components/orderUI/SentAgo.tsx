"use client";

import { Typography } from "@mui/material";
import { sentAgoLabel } from "@/app/lib/approvalCountdown";
import { useMonotonicElapsed } from "@/app/lib/hooks/useMonotonicElapsed";

const TICK_MS = 60_000;

/**
 * "Sent 3 min ago" under a Table round awaiting approval — a Table round
 * has no deadline, so no countdown. Starts from the SERVER's figure
 * (`sync` is the poll answer it came with) and moves on once a minute on
 * a monotonic clock, re-rendering only itself.
 */
export default function SentAgo({
  sentSecondsAgo,
  sync,
}: {
  sentSecondsAgo: number;
  /** The server answer the figure came with — a new one re-syncs. */
  sync: object;
}) {
  const elapsedMs = useMonotonicElapsed(sync, TICK_MS);
  return (
    <Typography variant="caption" component="p" color="text.secondary">
      {sentAgoLabel(sentSecondsAgo + Math.floor(elapsedMs / 1000))}
    </Typography>
  );
}
