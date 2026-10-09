import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import { NotFoundError, ValidationError } from "@/app/lib/errors";
import type { LocatedScope } from "@/app/lib/access/rolePolicy";
import { CartValidationService } from "../cartValidation.service";
import { TableService } from "../table.service";
import { OrderSessionService } from "./orderSession.service";
import { OrderSessionCartService } from "./orderSessionCart.service";
import { CounterSessionService } from "./counterSession.service";
import { TableSessionService } from "./tableSession.service";

type Tx = Prisma.TransactionClient;

/** The staff New Order screen (Backoffice): starting a session for the
 *  chosen table or the counter, editing its cart, and sending it straight
 *  to the kitchen (no approval step — staff ARE the approver). Every
 *  table / session id from the client is checked against the staff
 *  `scope` first (its company; a manager's own location only). */
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
  static async submitStaffOrder(sessionId: number, scope: LocatedScope) {
    const session = await OrderSessionService.getRoundForStaff(
      sessionId,
      scope,
    );
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
  static async startStaffSession(tableId: number, scope: LocatedScope) {
    const table = await TableService.getTableById(tableId, scope);
    return table.isCounter
      ? CounterSessionService.startNewCounterSession(table.locationId, table.id)
      : TableSessionService.startNewTableSession(table);
  }

  /** Adds a line to the staff's own cart round — the same cart method
   *  (and so the same note handling and line-merge rule) the customer
   *  flow uses. `tableId` must be the round's own table: it's written on
   *  the line, so a different one is refused as not found. */
  static async addItem(
    scope: LocatedScope,
    input: {
      sessionId: number;
      tableId: number;
      menuId: number;
      quantity: number;
      addonIds: number[];
      note?: string;
    },
  ) {
    const session = await OrderSessionService.getRoundForStaff(
      input.sessionId,
      scope,
    );
    if (session.tableId !== input.tableId) {
      throw new NotFoundError("Table", input.tableId);
    }
    return OrderSessionCartService.addItemToCart(
      input.sessionId,
      input.tableId,
      input.menuId,
      input.quantity,
      input.addonIds,
      input.note,
    );
  }

  /** A line's quantity, add-ons and note — the line must be in this
   *  round (OrderSessionCartService checks that part). */
  static async updateItem(
    scope: LocatedScope,
    input: {
      sessionId: number;
      orderId: number;
      quantity: number;
      addonIds: number[];
      note?: string;
    },
  ) {
    await OrderSessionService.getRoundForStaff(input.sessionId, scope);
    return OrderSessionCartService.updateItemInCart(
      input.sessionId,
      input.orderId,
      input.quantity,
      input.addonIds,
      input.note,
    );
  }

  static async removeItem(
    scope: LocatedScope,
    input: { sessionId: number; orderId: number },
  ) {
    await OrderSessionService.getRoundForStaff(input.sessionId, scope);
    return OrderSessionCartService.removeItemFromCart(
      input.sessionId,
      input.orderId,
    );
  }
}
