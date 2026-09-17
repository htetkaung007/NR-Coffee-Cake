"use client";

import { pollOrderStatusAction } from "@/app/(storefront)/counter/action";
import { usePolling } from "./usePolling";

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
 * Counter QR's own session-status polling for /cart (see
 * CartPageClient.tsx) — a thin wrapper around the generic usePolling
 * primitive that adds the one thing specific to this call site: a
 * terminal result routes to onTerminal instead of onResult. Table
 * QR's own polling (draft list + round status, no "terminal" concept
 * to speak of) calls usePolling directly instead of through here.
 */
export function usePollOrderStatus(
  enabled: boolean,
  onResult: (result: PollResult) => void,
  onTerminal: () => void,
) {
  usePolling(enabled, POLL_INTERVAL_MS, pollOrderStatusAction, (result) => {
    if (isTerminalPollOutcome(result.status)) {
      onTerminal();
      return;
    }
    onResult(result);
  });
}
