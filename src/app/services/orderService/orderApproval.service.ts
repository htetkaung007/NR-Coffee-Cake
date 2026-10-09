import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import { ValidationError } from "@/app/lib/errors";
import type { RejectDetails } from "@/app/lib/order/rejectReason";
import type { LocatedScope } from "@/app/lib/access/rolePolicy";
import { OrderSessionService } from "./orderSession.service";

type Tx = Prisma.TransactionClient;

/**
 * The cashier's decisions on a round waiting for approval: accept,
 * reject (through OrderSessionService.cancelSession, the one cancel
 * writer), and expiring the ones nobody answered in time. Called from
 * the Backoffice order Controllers and, for expiry, the Order List
 * reads (OrderListService).
 */
export class OrderApprovalService {
  /** Cashier taps Accept on the Backoffice dashboard —
   *  PENDING_APPROVAL -> PENDING (kitchen can start). */
  static async acceptCounterSession(sessionId: number, scope: LocatedScope) {
    const session = await OrderSessionService.getRoundForStaff(
      sessionId,
      scope,
    );
    if (session.status !== "PENDING_APPROVAL") {
      throw new ValidationError("This order is not awaiting approval.");
    }

    return prisma.orderSession.update({
      where: { id: sessionId },
      data: { status: "PENDING", approvalExpiresAt: null },
    });
  }

  /** Cashier taps Reject — PENDING_APPROVAL -> CANCELLED (reason
   *  REJECTED, stock given back — see OrderSessionService.cancelSession).
   *  Same terminal outcome as a timeout (getSessionStatus), just
   *  cashier-initiated instead of time-initiated. The cashier's reason
   *  (and, for Other, their optional note) is kept on the round's
   *  OrderCancellation row. */
  static async rejectCounterSession(
    sessionId: number,
    scope: LocatedScope,
    details: RejectDetails,
  ) {
    const session = await OrderSessionService.getRoundForStaff(
      sessionId,
      scope,
    );
    if (session.status !== "PENDING_APPROVAL") {
      throw new ValidationError("This order is not awaiting approval.");
    }

    return prisma.$transaction(async (tx: Tx) => {
      const rejected = await OrderSessionService.cancelSession(
        tx,
        sessionId,
        "REJECTED",
        details,
      );
      // Lost a race with Accept or the timeout between the check above
      // and this write — same answer the check itself would give now.
      if (!rejected) {
        throw new ValidationError("This order is not awaiting approval.");
      }
      return tx.orderSession.findUniqueOrThrow({ where: { id: sessionId } });
    });
  }

  /** Batch version of the lazy-expiry check in
   *  OrderSessionService.getSessionStatus — run once at the top of the
   *  Backoffice Order List page load so a timed-out PENDING_APPROVAL
   *  session doesn't still show up asking for a decision the
   *  customer's own polling has already resolved (CANCELLED) on their
   *  end.
   *
   *  Loads the stale ids first, then cancels each through
   *  OrderSessionService.cancelSession (reason EXPIRED, stock given
   *  back) in its own transaction — each round's cancel is a
   *  self-contained unit, so one failing doesn't hold back the rest.
   *  A round the customer's own poll already expired is skipped by
   *  cancelSession itself, never restocked twice. */
  static async expireStaleApprovals(locationId: number) {
    const stale = await prisma.orderSession.findMany({
      where: {
        locationId,
        status: "PENDING_APPROVAL",
        approvalExpiresAt: { lt: new Date() },
        isArchived: false,
      },
      select: { id: true },
    });
    for (const session of stale) {
      await prisma.$transaction((tx: Tx) =>
        OrderSessionService.cancelSession(tx, session.id, "EXPIRED"),
      );
    }
  }
}
