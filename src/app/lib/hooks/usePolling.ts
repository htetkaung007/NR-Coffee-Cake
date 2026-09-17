"use client";

import { useEffect, useRef } from "react";

/**
 * The actual shared plumbing behind both usePollOrderStatus (Counter/
 * Table-round status) and Table QR's own draft polling — setInterval,
 * cleanup, and calling a poll function on a fixed cadence. Split out
 * once a second call site needed the exact same interval/cleanup
 * scaffolding but with no "terminal outcome" concept to layer on top
 * (a table's draft list never "terminates" the way a session does) —
 * rather than copy the setInterval/useRef boilerplate a second time,
 * usePollOrderStatus is now a thin wrapper around this.
 *
 * pollFn/onResult are read via a ref rather than the effect's own
 * dependency array — callers pass a fresh inline closure every render,
 * and depending on those directly would tear the interval down and
 * rebuild it every render instead of once per `enabled` change.
 */
export function usePolling<T>(
  enabled: boolean,
  intervalMs: number,
  pollFn: () => Promise<T>,
  onResult: (result: T) => void,
) {
  const pollFnRef = useRef(pollFn);
  const onResultRef = useRef(onResult);

  // Refs can't be written during render (React 19's rule) — this
  // effect (no dependency array, so it runs after every render) is
  // the correct place to keep them current instead.
  useEffect(() => {
    pollFnRef.current = pollFn;
    onResultRef.current = onResult;
  });

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      const result = await pollFnRef.current();
      onResultRef.current(result);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, intervalMs]);
}
