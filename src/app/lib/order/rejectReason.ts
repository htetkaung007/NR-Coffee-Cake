import { RejectReason } from "../../../../prisma/generated/enums";

export type { RejectReason };

/** Every reason a cashier can give for rejecting a round, in the enum's
 *  order — the order the Reject dialog lists them in. Taken from the
 *  Prisma enum itself, so a new value can't be forgotten here. */
export const REJECT_REASONS = Object.values(RejectReason) as readonly RejectReason[];

const LABELS: Record<RejectReason, string> = {
  OUT_OF_STOCK: "Out of stock",
  SUSPECTED_FAKE: "Looks fake / customer not here",
  CUSTOMER_REQUEST: "Customer asked to cancel",
  OTHER: "Other",
};

/** The reason as staff read it ("Out of stock"). */
export function rejectReasonLabel(reason: RejectReason): string {
  return LABELS[reason];
}

export function isRejectReason(value: unknown): value is RejectReason {
  return (
    typeof value === "string" &&
    (REJECT_REASONS as readonly string[]).includes(value)
  );
}

/** A rejected round whose reason wasn't recorded — rejected before
 *  reasons were kept, or (shouldn't happen) a row without one. */
const NOT_RECORDED = "NOT_RECORDED" as const;

export type RejectReasonBucket = RejectReason | typeof NOT_RECORDED;

const SHORT_LABELS: Record<RejectReasonBucket, string> = {
  OUT_OF_STOCK: "Out of stock",
  SUSPECTED_FAKE: "Looks fake",
  CUSTOMER_REQUEST: "Customer asked",
  OTHER: "Other",
  NOT_RECORDED: "Not recorded",
};

/** The compact name for tight spots (the Reports Cancelled card). */
export function rejectReasonShortLabel(bucket: RejectReasonBucket): string {
  return SHORT_LABELS[bucket];
}

/** How many of the REJECTED rounds were rejected for each reason —
 *  every reason in REJECT_REASONS order, then "Not recorded" (no
 *  cancellation row, or no reason on it). Other rounds are ignored. */
export function summarizeRejectReasons(
  rounds: readonly {
    cancelReason: string | null;
    cancellation: { rejectReason: string | null } | null;
  }[],
): { reason: RejectReasonBucket; count: number }[] {
  const buckets: RejectReasonBucket[] = [...REJECT_REASONS, NOT_RECORDED];
  const counts = new Map(buckets.map((bucket) => [bucket, 0]));
  for (const round of rounds) {
    if (round.cancelReason !== "REJECTED") continue;
    const reason = round.cancellation?.rejectReason;
    const bucket = isRejectReason(reason) ? reason : NOT_RECORDED;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return [...counts].map(([reason, count]) => ({ reason, count }));
}

/** "Out of stock 1 · Looks fake 2" — the non-zero buckets only; "" when
 *  there are none. */
export function formatRejectReasonCounts(
  summary: readonly { reason: RejectReasonBucket; count: number }[],
): string {
  return summary
    .filter((entry) => entry.count > 0)
    .map((entry) => `${rejectReasonShortLabel(entry.reason)} ${entry.count}`)
    .join(" · ");
}

/** What a rejection carries into cancelSession: only Other may have a
 *  note (null when the cashier left it empty) — a note on any other
 *  reason is a compile error. */
export type RejectDetails =
  | { rejectReason: "OTHER"; note: string | null }
  | { rejectReason: Exclude<RejectReason, "OTHER"> };

/** The hard limit on a rejection note (also the DB column's VarChar). */
export const REJECT_NOTE_MAX_LENGTH = 120;
