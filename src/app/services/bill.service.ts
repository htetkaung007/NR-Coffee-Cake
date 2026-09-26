import { ValidationError } from "../lib/errors";
import { orderLinesTotal } from "../lib/orderTotals";
import type { Prisma } from "../../../prisma/generated/client";

type Tx = Prisma.TransactionClient;

/** A session as BillService needs it to price and label a bill — see
 *  createForPaidSessions. */
interface PayableSession {
  id: number;
  orderNumber: string;
  locationId: number;
  orders: {
    quantity: number;
    unitPrice: number;
    OrdersAddons: { unitPrice: number }[];
  }[];
}

/**
 * Bill creation — one immutable Bill row per PAID bill (see Bill's own
 * schema comment). Split out from OrderSessionApprovalService (which
 * calls into this, not the other way around) because bills have their
 * own reason to change going forward (billing history/search queries),
 * distinct from approval/payment workflow — see CLAUDE.md Rule 14.
 */
export class BillService {
  /** The bill's display/search number — the FIRST round's orderNumber
   *  (smallest id), never whichever round happened to trigger payment,
   *  same "oldest round is the root" rule groupSessionsForDisplay's
   *  title already uses for Counter entries. */
  static billNumberFor(sessions: Pick<PayableSession, "id" | "orderNumber">[]) {
    const firstRound = sessions.reduce((oldest, session) =>
      session.id < oldest.id ? session : oldest,
    );
    return firstRound.orderNumber;
  }

  /** The one locationId a bill can have — throws if the sessions being
   *  paid together don't actually share one, since a Bill has a single
   *  locationId column (kept there on purpose for history filtering —
   *  see Bill's own schema comment) and silently picking one location
   *  would misfile the bill for the others. */
  static sharedLocationIdFor(sessions: Pick<PayableSession, "locationId">[]) {
    const locationIds = new Set(sessions.map((session) => session.locationId));
    if (locationIds.size !== 1) {
      throw new ValidationError(
        "Sessions being paid together must share one location.",
      );
    }
    return sessions[0].locationId;
  }

  /** What gets charged — every session's lines, priced only through
   *  the shared snapshot-based total helper (never Menu.price/
   *  Addon.price directly — see orderLineTotal's own comment). */
  static totalFor(sessions: Pick<PayableSession, "orders">[]) {
    return orderLinesTotal(sessions.flatMap((session) => session.orders));
  }

  /** Creates the ONE Bill row for a set of sessions being paid together
   *  — called from inside OrderSessionApprovalService's markSessionsPaid/
   *  markSessionPaid transaction, before those sessions are written to
   *  PAID, so a Bill-creation failure rolls back the whole payment (no
   *  session ends up PAID without a bill). billNumber/locationId/total
   *  are each their own pure static method above so the bill-math can
   *  be unit-tested without a transaction. */
  static async createForPaidSessions(tx: Tx, sessions: PayableSession[]) {
    if (sessions.length === 0) {
      throw new ValidationError("No sessions to bill.");
    }

    return tx.bill.create({
      data: {
        billNumber: BillService.billNumberFor(sessions),
        locationId: BillService.sharedLocationIdFor(sessions),
        total: BillService.totalFor(sessions),
        paidAt: new Date(),
      },
    });
  }
}
