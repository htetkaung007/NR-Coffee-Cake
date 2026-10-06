import { approvalDeadline } from "./approvalDeadline";
import { APPROVAL_WINDOW_SECONDS } from "./approvalWindow";
import { toShopTime } from "./shopDay";

/** What a round awaiting approval tells the customer's screen: the
 *  seconds left (server clock), the whole window, the deadline (for "If
 *  it isn't confirmed by 10:12…" / "Usually confirmed by 10:12."), and
 *  whether the round cancels itself then (Counter) or only becomes
 *  overdue (Table). null when the round isn't waiting, or a Counter round
 *  unexpectedly has no deadline — the screen then shows the plain
 *  waiting text. */
export interface ApprovalTiming {
  /** Seconds until the deadline on the server's clock — NEGATIVE once it
   *  has passed (a Table round can be overdue for a while), so "sent N
   *  min ago" can be worked out exactly as windowSeconds −
   *  secondsRemaining. The screen shows remainingSeconds(…), which never
   *  goes below 0. */
  secondsRemaining: number;
  windowSeconds: number;
  /** ISO. */
  expiresAt: string;
  /** The deadline as "10:12" on the SHOP's clock — formatted on the
   *  server, so the phone's own timezone never matters. */
  deadlineTime: string;
  /** Counter: true. Table: false — never cancelled, see approvalDeadline. */
  autoCancels: boolean;
}

/** Server-side only (it reads the shop's timezone from the server's
 *  config). The deadline itself comes from approvalDeadline — the one
 *  place it's decided. */
export function approvalTiming(
  round: {
    status: string;
    isCounter: boolean;
    createdAt: Date;
    approvalExpiresAt: Date | null;
  },
  now: Date,
): ApprovalTiming | null {
  const due = approvalDeadline(round);
  if (!due) return null;
  return {
    secondsRemaining: Math.round((due.deadline.getTime() - now.getTime()) / 1000),
    windowSeconds: APPROVAL_WINDOW_SECONDS,
    expiresAt: due.deadline.toISOString(),
    deadlineTime: toShopTime(due.deadline),
    autoCancels: due.autoCancels,
  };
}
