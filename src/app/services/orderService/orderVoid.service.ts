import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import { NotFoundError, ValidationError } from "@/app/lib/errors";
import { canActAtLocation, firstUnownedId } from "@/app/lib/access/ownership";
import type { LocatedScope } from "@/app/lib/access/rolePolicy";
import {
  VOIDABLE_ROUND_STATUSES,
  effectiveQuantity,
  planVoid,
  type VoidDetails,
} from "@/app/lib/order/voids";
import { MenuStockService } from "../menuStock.service";

type Tx = Prisma.TransactionClient;

/**
 * Voids — staff taking items back off an ACCEPTED, UNPAID order, from any
 * source (staff, Counter QR, Table QR). The ONLY writer of OrderVoid: a
 * row is history, written once and never edited. Accepted rounds are
 * still never CANCELLED (that's OrderSessionService.cancelSession, for
 * rounds that were never accepted); their lines are voided instead, and
 * every total leaves voided units out (orderTotals.orderLineTotal).
 */
export class OrderVoidService {
  /**
   * Voids `quantity` units of one display line — `orderIds` are its Order
   * rows (several when identical lines from different customers are
   * merged for display), all in ONE round — in one transaction:
   *  1. the rows must be lines of a round of `scope`'s company, at a
   *     location `scope` may act at (canActAtLocation) — anything else is
   *     the same NotFoundError as a row that doesn't exist;
   *  2. the round is LOCKED (a conditional row write) and must still be
   *     accepted and unpaid — the same lock markSessionsPaid takes first,
   *     so a concurrent payment either counts this void or makes it fail
   *     here with a ValidationError, never in between;
   *  3. the rows are re-read under that lock: a concurrent void of the
   *     same line has committed by now, so "how many are left" is exact;
   *  4. one OrderVoid per row touched (planVoid — oldest row first);
   *  5. if `returnToStock`, the units go back into MenuStock at the
   *     round's location.
   */
  static async voidLine(input: {
    orderIds: readonly number[];
    quantity: number;
    details: VoidDetails;
    returnToStock: boolean;
    scope: LocatedScope;
  }) {
    const { scope } = input;
    const orderIds = [...new Set(input.orderIds)];

    return prisma.$transaction(async (tx: Tx) => {
      const round = await OrderVoidService.findRound(tx, orderIds, scope);

      const locked = await tx.orderSession.updateMany({
        where: {
          id: round.id,
          isArchived: false,
          billId: null,
          status: { in: [...VOIDABLE_ROUND_STATUSES] },
        },
        data: { updateTime: new Date() },
      });
      if (locked.count === 0) {
        throw new ValidationError(await OrderVoidService.whyNotVoidable(tx, round.id));
      }

      const rows = await tx.order.findMany({
        where: { id: { in: orderIds }, orderSessionId: round.id, isArchived: false },
        orderBy: { id: "asc" },
        select: {
          id: true,
          menuId: true,
          quantity: true,
          voids: { select: { quantity: true } },
        },
      });
      const plan = planVoid(rows, input.quantity);
      if (!plan) {
        const left = rows.reduce((sum, row) => sum + effectiveQuantity(row), 0);
        throw new ValidationError(
          left === 0
            ? "Every item on this line is already voided."
            : `Only ${left} left to void on this line.`,
        );
      }

      const note = input.details.reason === "OTHER" ? input.details.note : null;
      for (const entry of plan) {
        await tx.orderVoid.create({
          data: {
            orderId: entry.orderId,
            quantity: entry.quantity,
            reason: input.details.reason,
            note,
            stockReturned: input.returnToStock,
            voidedById: scope.userId,
          },
        });
      }

      if (input.returnToStock) {
        // One display line is one menu (lineMergeKey) — all rows share it.
        await MenuStockService.incrementStock(
          tx,
          rows[0].menuId,
          round.locationId,
          input.quantity,
        );
      }

      return { sessionId: round.id, voided: input.quantity };
    });
  }

  /** Chain lookup: the ONE round the rows belong to, if `scope` may act
   *  there. Rows of another company, at a location a manager can't act
   *  at, draft lines (no round) or unknown ids are all the same
   *  NotFoundError; rows from two rounds aren't one line. */
  private static async findRound(
    tx: Tx,
    orderIds: readonly number[],
    scope: LocatedScope,
  ) {
    const rows = await tx.order.findMany({
      where: {
        id: { in: [...orderIds] },
        isArchived: false,
        orderSession: { location: { companyId: scope.companyId } },
      },
      select: {
        id: true,
        orderSession: {
          select: {
            id: true,
            locationId: true,
            location: { select: { companyId: true } },
          },
        },
      },
    });
    const allowed = rows.filter(
      (row) =>
        row.orderSession !== null &&
        canActAtLocation(scope, {
          companyId: row.orderSession.location.companyId,
          locationId: row.orderSession.locationId,
        }),
    );
    const unowned = firstUnownedId(
      orderIds,
      allowed.map((row) => row.id),
    );
    if (unowned !== null) throw new NotFoundError("Order line", unowned);

    const roundIds = new Set(allowed.map((row) => row.orderSession!.id));
    if (roundIds.size !== 1) {
      throw new ValidationError("Void one line of one order at a time.");
    }
    return allowed[0].orderSession!;
  }

  /** The plain reason a round can't be voided from (read after the lock
   *  found nothing to lock). */
  private static async whyNotVoidable(tx: Tx, sessionId: number) {
    const round = await tx.orderSession.findUnique({
      where: { id: sessionId },
      select: { status: true, billId: true },
    });
    if (round?.status === "PENDING_APPROVAL") {
      return "Accept or reject this order first — only accepted orders can have items voided.";
    }
    if (round?.status === "PAID" || round?.billId) {
      return "This order has already been paid.";
    }
    return "This order can no longer be changed.";
  }
}
