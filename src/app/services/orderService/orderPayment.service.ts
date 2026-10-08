import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import { ValidationError } from "@/app/lib/errors";
import { BillService } from "../bill.service";
import { OrderSessionService } from "./orderSession.service";

type Tx = Prisma.TransactionClient;

/** Taking payment: mark a bill's rounds PAID, create its Bill
 *  (BillService), and tidy up what the table or counter left behind —
 *  all in one transaction. */
export class OrderPaymentService {
  /** Everything that has to happen once a session (or a batch of them)
   *  is written to PAID, inside the SAME transaction as that status
   *  write — markSessionsPaid calls this last, so the post-payment
   *  cleanup lives in exactly one place.
   *
   *  No stock changes here: drafts (Table QR) and a CART round
   *  (Counter "Order More") were never decremented in the first place
   *  — that only happens at submit (decrementStockForSession /
   *  TableDraftService.submitDraft) — so there's nothing to restore.
   *
   *  a) Table QR — bumps Table.contributorEpoch per distinct tableId
   *     (unchanged logic, moved here from markSessionsPaid — see the
   *     epoch bump's own reasoning below),
   *     then deletes that table's leftover drafts (Order rows with
   *     orderSessionId: null), same delete-addons-then-orders pattern
   *     TableDraftService.submitDraft uses. Without this, the NEXT
   *     group seated at this table would see — and could submit —
   *     the previous group's unsent picks (Problem B).
   *
   *     Epoch bump: every contributor's CONTRIBUTOR_TOKEN_COOKIE entry
   *     was minted under the table's epoch at scan time, so bumping it
   *     is what makes their old tokens read as stale and forces a
   *     fresh QR scan before anyone can start a new draft at this
   *     table. Counter sessions never carry a contributor token to
   *     begin with, so there's nothing to invalidate for them even if
   *     tableId happens to be set.
   *
   *  b) Counter — a round still sitting in CART belongs to a bill
   *     whose OTHER round just got paid (e.g. "Order More" started a
   *     fresh round the customer never touched again — Problem A).
   *     Cancels every CART round on the same bill through
   *     OrderSessionService.cancelSession (reason UNSUBMITTED — no
   *     stock to give back) — root id via billSessionId ?? id, across
   *     both this batch's own sessions and any sibling round the Order
   *     List never even showed — so the
   *     customer's cookie — which may still point at that CART round
   *     — reads as terminal on their next poll/scan instead of
   *     silently staying open for more orders after payment. */
  private static async cleanUpAfterPayment(
    tx: Tx,
    sessions: {
      id: number;
      tableId: number | null;
      isCounter: boolean;
      billSessionId: number | null;
    }[],
  ) {
    const tableIds = [
      ...new Set(
        sessions
          .filter((session) => !session.isCounter && session.tableId)
          .map((session) => session.tableId as number),
      ),
    ];
    for (const tableId of tableIds) {
      await tx.table.update({
        where: { id: tableId },
        data: { contributorEpoch: { increment: 1 } },
      });
      await tx.ordersAddon.deleteMany({
        where: { order: { tableId, orderSessionId: null } },
      });
      await tx.order.deleteMany({ where: { tableId, orderSessionId: null } });
    }

    const billIds = [
      ...new Set(
        sessions
          .filter((session) => session.isCounter)
          .map((session) => session.billSessionId ?? session.id),
      ),
    ];
    if (billIds.length > 0) {
      const leftoverCartRounds = await tx.orderSession.findMany({
        where: {
          isCounter: true,
          status: "CART",
          isArchived: false,
          OR: [{ id: { in: billIds } }, { billSessionId: { in: billIds } }],
        },
        select: { id: true },
      });
      for (const round of leftoverCartRounds) {
        await OrderSessionService.cancelSession(tx, round.id, "UNSUBMITTED");
      }
    }
  }

  /** Marks every given session PAID — one write for every open round
   *  of a table's tab, or every round of a Counter bill (see the
   *  "Order More" design discussion: multiple OrderSession rows can
   *  now represent multiple rounds for the same table/bill, so settling
   *  it means paying all of them at once, not one at a time). This is
   *  also THE single trigger that (a) frees a table for the next
   *  group, since getActiveRoundForTable treats any terminal session
   *  as "no active round" without needing an extra write here beyond
   *  the status change, and (b) makes the customer's *next* request
   *  (page load or poll) the point where their cookie gets cleared and
   *  they're shown read-only browsing (design doc sections 3 and 6).
   *  This Service never touches cookies itself — cookies are a Route
   *  Handler/Server Action concern — the cashier's browser calling
   *  this is a *different* browser from the customer's, so there is no
   *  cookie to clear here even in principle; the customer-facing
   *  endpoint is what reacts to PAID the next time that browser is
   *  heard from.
   *
   *  Everything happens in ONE transaction, so a failure anywhere
   *  leaves nothing marked paid and no Bill row behind:
   *   1. Load the sessions WITH their lines/add-ons (BillService needs
   *      those to price the bill) and refuse (ValidationError) if any
   *      is already PAID or already has a billId — the double-click/
   *      double-pay guard, since a second call for the same session(s)
   *      must not mint a second Bill.
   *   2. BillService.createForPaidSessions — the one Bill row for this
   *      whole batch (billNumber = first round's orderNumber, total =
   *      every session's lines via the snapshot-based total helper).
   *   3. Write status PAID and that Bill's id onto every session.
   *   4. cleanUpAfterPayment, called last, exactly as before (Table QR
   *      epoch bump/leftover drafts, Counter's sibling CART rounds on
   *      the same bill) — its own comment covers why. */
  static async markSessionsPaid(sessionIds: number[]) {
    if (sessionIds.length === 0) {
      throw new ValidationError("No sessions to mark as paid.");
    }

    return prisma.$transaction(async (tx) => {
      const sessions = await tx.orderSession.findMany({
        where: { id: { in: sessionIds }, isArchived: false },
        include: {
          orders: {
            where: { isArchived: false },
            include: { OrdersAddons: true },
          },
        },
      });

      const alreadyPaid = sessions.find(
        (session) => session.status === "PAID" || session.billId !== null,
      );
      if (alreadyPaid) {
        throw new ValidationError("This order has already been paid.");
      }

      const bill = await BillService.createForPaidSessions(tx, sessions);

      const result = await tx.orderSession.updateMany({
        where: { id: { in: sessionIds }, isArchived: false },
        data: { status: "PAID", billId: bill.id },
      });
      await OrderPaymentService.cleanUpAfterPayment(tx, sessions);
      return result;
    });
  }
}
