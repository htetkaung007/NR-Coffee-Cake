"use client";

import { useEffect, useRef } from "react";
import { pollOrderStatusAction } from "@/app/(storefront)/customer/action";

export const POLL_INTERVAL_MS = 4000;

type PollResult = Awaited<ReturnType<typeof pollOrderStatusAction>>;

/** A terminal poll result (session approved-then-paid, rejected, timed
 *  out, or already gone) means there's nothing left to poll for — both
 *  call sites need this exact same check, so it lives here once
 *  instead of two copies that could quietly drift apart. */
function isTerminalPollOutcome(status: PollResult["status"]) {
  return (
    status === "no_session" ||
    status === "PAID" ||
    status === "CANCELLED" ||
    status === "COMPLETED"
  );
}

/**
 * Shared polling loop for both /menu (Table QR's shared cart — see
 * counterorderclient.tsx's isTableSession) and /cart (this customer's
 * own submitted order — see CartPageClient.tsx). The only thing that
 * actually differs between the two call sites is what happens with a
 * tick's result, so this hook owns the interval/cleanup/terminal-check
 * plumbing and leaves that "what to do with it" part to the caller's
 * two callbacks.
 *
 * onResult/onTerminal are read via a ref rather than the effect's own
 * dependency array — callers pass a fresh inline closure every render
 * (setCart/setStatus/router calls), and depending on those directly
 * would tear the interval down and rebuild it every render instead of
 * once per `enabled` change.
 */
export function usePollOrderStatus(
  enabled: boolean,
  onResult: (result: PollResult) => void,
  onTerminal: () => void,
) {
  const onResultRef = useRef(onResult);
  const onTerminalRef = useRef(onTerminal);

  // Refs can't be written during render (React 19's rule) — this
  // effect (no dependency array, so it runs after every render) is
  // the correct place to keep them current instead.
  useEffect(() => {
    onResultRef.current = onResult;
    onTerminalRef.current = onTerminal;
  });

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(async () => {
      const result = await pollOrderStatusAction();
      if (isTerminalPollOutcome(result.status)) {
        onTerminalRef.current();
        return;
      }
      onResultRef.current(result);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled]);
}
