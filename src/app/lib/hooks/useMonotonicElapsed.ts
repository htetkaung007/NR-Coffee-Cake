"use client";

import { useEffect, useState } from "react";

/**
 * Milliseconds elapsed since `sync` (a server answer) arrived, counted
 * with performance.now() — a monotonic clock, so a wrong phone clock, or
 * one changed while the page is open, never moves it. Re-syncs whenever
 * `sync` is a new object (each poll's answer); stops (and reads 0) while
 * `sync` is null or once the component unmounts. Ticks every `tickMs`,
 * re-rendering only the component that calls it.
 */
export function useMonotonicElapsed(sync: object | null, tickMs: number): number {
  const [reading, setReading] = useState<{ sync: object | null; elapsedMs: number }>({
    sync: null,
    elapsedMs: 0,
  });

  useEffect(() => {
    if (!sync) return;
    const syncedAt = performance.now();
    const id = setInterval(() => {
      setReading({ sync, elapsedMs: performance.now() - syncedAt });
    }, tickMs);
    return () => clearInterval(id);
  }, [sync, tickMs]);

  // A reading from an older answer counts as "just synced".
  return reading.sync === sync ? reading.elapsedMs : 0;
}
