import type { RejectReason } from "./rejectReason";

/** The times on an OrderCancellation row, and how long a customer
 *  waited. Pure — OrderSessionService.cancelSession calls these with the
 *  session as it was just BEFORE the cancel cleared approvalExpiresAt. */

/** When the customer submitted the round. Nothing is stored at submit,
 *  so it's derived:
 *  - a deadline was set (a Counter round, submitCartRoundForApproval):
 *    the deadline minus the approval window;
 *  - no deadline, Counter round: its last write before the cancel
 *    (updateTime);
 *  - no deadline, Table round: TableDraftService.submitDraft creates
 *    the round already PENDING_APPROVAL at the moment of Send, so its
 *    creation time. */
export function deriveRequestedAt(
  session: {
    approvalExpiresAt: Date | null;
    createdAt: Date;
    updateTime: Date;
    isCounter: boolean;
  },
  windowMinutes: number,
): Date {
  if (session.approvalExpiresAt) {
    return new Date(session.approvalExpiresAt.getTime() - windowMinutes * 60_000);
  }
  return session.isCounter ? session.updateTime : session.createdAt;
}

/** When it ended: a rejection when the cashier tapped Reject (now); an
 *  expiry at its deadline — not whenever a poll or sweep noticed it —
 *  or now if it somehow had none. */
export function deriveDecidedAt(
  reason: "REJECTED" | "EXPIRED",
  approvalExpiresAt: Date | null,
  now: Date,
): Date {
  if (reason === "EXPIRED" && approvalExpiresAt) return approvalExpiresAt;
  return now;
}

/** Whole seconds from request to decision; null when either is missing
 *  or the decision comes before the request. */
export function waitSeconds(
  requestedAt: Date | null | undefined,
  decidedAt: Date | null | undefined,
): number | null {
  if (!requestedAt || !decidedAt) return null;
  const milliseconds = decidedAt.getTime() - requestedAt.getTime();
  if (milliseconds < 0) return null;
  return Math.round(milliseconds / 1000);
}

/** "45s", "1m 40s", "12m", "1h 05m"; "—" when unknown. */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

/** What a round's OrderCancellation row adds to its History entry — the
 *  reason, and the wait instead of the two raw times (plain values, so
 *  it crosses the Server → Client boundary as is). */
export interface CancellationDetail {
  rejectReason: RejectReason | null;
  /** Submit to decision, in whole seconds (null when unknown). */
  waitSeconds: number | null;
}

/** null for a round with no row (cancelled before rows were kept). */
export function toCancellationDetail(
  row: {
    requestedAt: Date;
    decidedAt: Date;
    rejectReason: RejectReason | null;
  } | null,
): CancellationDetail | null {
  if (!row) return null;
  return {
    rejectReason: row.rejectReason,
    waitSeconds: waitSeconds(row.requestedAt, row.decidedAt),
  };
}
