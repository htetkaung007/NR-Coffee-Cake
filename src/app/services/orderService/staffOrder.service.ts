import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import { NotFoundError, ValidationError } from "@/app/lib/errors";
import { CartValidationService } from "../cartValidation.service";
import { OrderSessionService } from "./orderSession.service";
import { CounterSessionService } from "./counterSession.service";
import { TableSessionService } from "./tableSession.service";

type Tx = Prisma.TransactionClient;

/** The staff New Order screen (Backoffice): starting a session for the
 *  chosen table or the counter, and sending it straight to the kitchen
 *  (no approval step — staff ARE the approver). */
export class StaffOrderService {
  /** Staff Order-taking page equivalent of submitCartRoundForApproval —
   *  CART -> PENDING directly, skipping PENDING_APPROVAL entirely.
   *  There's no cashier to approve a manager's own order against
   *  (they ARE the person who'd be approving it), so the 2-minute
   *  approval window would just be a pointless wait before the
   *  kitchen sees it. Everything downstream (kitchen sees it in
   *  PENDING, gets marked COOKING, eventually markSessionsPaid) is
   *  unchanged and identical to a normal accepted order — this only
   *  removes the approval STEP, not any of the states after it. */
  static async submitStaffOrder(sessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);
    if (session.status !== "CART") {
      throw new ValidationError(
        "This order has already been submitted or is no longer editable.",
      );
    }
    // A line added before its menu was hidden here can't be sent.
    const lines = await prisma.order.findMany({
      where: { orderSessionId: sessionId, isArchived: false },
      select: { menuId: true },
    });
    await CartValidationService.assertMenusListed(
      session.locationId,
      lines.map((line) => line.menuId),
    );

    return prisma.$transaction(async (tx: Tx) => {
      await OrderSessionService.decrementStockForSession(
        tx,
        sessionId,
        session.locationId,
      );
      return tx.orderSession.update({
        where: { id: sessionId },
        data: { status: "PENDING" },
      });
    });
  }

  /** For the Staff Order-taking page (design doc section 7) — starts a
   *  session with no scan/cookie/key involved at all, since a
   *  staff-placed order has no restriction. Reuses
   *  startNewTableSession / startNewCounterSession so the resulting
   *  row looks identical to one a real scan would have produced. */
  static async startStaffSession(table: {
    id: number;
    locationId: number;
    isCounter: boolean | null;
  }) {
    return table.isCounter
      ? CounterSessionService.startNewCounterSession(table.locationId, table.id)
      : TableSessionService.startNewTableSession(table);
  }
}
