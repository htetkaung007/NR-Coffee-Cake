import { secondsUntil } from "./approvalCountdown";
import { APPROVAL_WINDOW_SECONDS } from "./approvalWindow";
import { toShopTime } from "./shopDay";

/** What a Counter round awaiting approval tells the customer's screen:
 *  the seconds left (server clock), the whole window, and the deadline
 *  (for "If it isn't confirmed by 10:12…"). null when the round isn't
 *  waiting, or unexpectedly has no deadline — the screen then shows the
 *  plain waiting text. */
export interface ApprovalTiming {
  secondsRemaining: number;
  windowSeconds: number;
  /** ISO. */
  expiresAt: string;
  /** The deadline as "10:12" on the SHOP's clock — formatted on the
   *  server, so the phone's own timezone never matters. */
  deadlineTime: string;
}

/** Server-side only (it reads the shop's timezone from the server's
 *  config). */
export function approvalTiming(
  round: { status: string; approvalExpiresAt: Date | null },
  now: Date,
): ApprovalTiming | null {
  if (round.status !== "PENDING_APPROVAL" || !round.approvalExpiresAt) return null;
  return {
    secondsRemaining: secondsUntil(round.approvalExpiresAt, now),
    windowSeconds: APPROVAL_WINDOW_SECONDS,
    expiresAt: round.approvalExpiresAt.toISOString(),
    deadlineTime: toShopTime(round.approvalExpiresAt),
  };
}
