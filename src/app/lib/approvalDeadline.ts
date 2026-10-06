import { APPROVAL_WINDOW_SECONDS } from "./approvalWindow";

/** When a round awaiting approval is due, and what happens then. */
export interface ApprovalDeadline {
  deadline: Date;
  /** Counter: true — the round cancels itself (EXPIRED) at the deadline.
   *  Table: false — a soft target only; past it the round is "overdue",
   *  never cancelled. */
  autoCancels: boolean;
}

/**
 * THE one place "when is this round due" is decided. null unless the
 * round is awaiting approval.
 *
 * - Counter: the stored approvalExpiresAt (set at submit) — null when it
 *   unexpectedly has none.
 * - Table: createdAt + the approval window. A Table round is created at
 *   the moment of Send, so that's when its clock starts. Computed, never
 *   stored: a Table round's approvalExpiresAt must stay null, because
 *   expireStaleApprovals cancels ANY waiting round whose approvalExpiresAt
 *   has passed — and an expired Table round would lose the whole group's
 *   order (its drafts are merged and deleted at Send). Even if one were
 *   set, it's ignored here.
 */
export function approvalDeadline(session: {
  status: string;
  isCounter: boolean;
  createdAt: Date;
  approvalExpiresAt: Date | null;
}): ApprovalDeadline | null {
  if (session.status !== "PENDING_APPROVAL") return null;
  if (session.isCounter) {
    return session.approvalExpiresAt
      ? { deadline: session.approvalExpiresAt, autoCancels: true }
      : null;
  }
  return {
    deadline: new Date(session.createdAt.getTime() + APPROVAL_WINDOW_SECONDS * 1000),
    autoCancels: false,
  };
}
