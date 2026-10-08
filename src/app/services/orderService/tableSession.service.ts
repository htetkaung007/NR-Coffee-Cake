import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import { shownCancelReason } from "@/app/lib/order/roundOutcome";
import { ACTIVE_ORDER_LINES, ORDER_LINE_INCLUDE } from "./orderLineQuery";
import { generateOrderNumber, isSessionTerminal } from "./orderSession.service";

type Tx = Prisma.TransactionClient;

/** Table QR — the scan, and a table's rounds as the customer's pages
 *  show them (active, last rejected, detail, history). Sessions here are
 *  created by TableDraftService.submitDraft or startNewTableSession; the
 *  shared lifecycle (cancel, status) is OrderSessionService's. */
export class TableSessionService {
  /** Used by startStaffSession (a staff-placed order, no scan/cookie
   *  involved) to create a Table-QR-shaped session directly. No longer
   *  called from the customer-facing scan flow (see
   *  resolveTableQrScan's own comment) — drafts replaced that path,
   *  but a staff member manually opening a tab for a walk-in table
   *  still needs a real session to exist right away, so this stays. */
  static async startNewTableSession(table: { id: number; locationId: number }) {
    return prisma.$transaction(async (tx: Tx) => {
      const session = await tx.orderSession.create({
        data: {
          locationId: table.locationId,
          tableId: table.id,
          isCounter: false,
          status: "CART",
          orderNumber: "",
        },
      });

      const numbered = await tx.orderSession.update({
        where: { id: session.id },
        data: { orderNumber: generateOrderNumber(session.id) },
      });

      // This write is what "opens the gate" for the table — see design
      // doc section 3, rule 2.
      await tx.table.update({
        where: { id: table.id },
        data: { activeSessionId: session.id },
      });

      return numbered;
    });
  }

  /** Table QR — validates the table's rotating key
   *  (Table.counterAccessKey), same check Counter's key gets, but no
   *  longer resolves or creates an OrderSession here. With drafts
   *  decoupled from any session (see TableDraftService), a scan only
   *  needs to confirm this is a real, current table link — the scan
   *  Route Handler uses the returned table's id to set up this
   *  browser's contributorToken (getOrCreateContributorToken), and a
   *  session only ever gets created later, at Send to Kitchen
   *  (TableDraftService.submitDraft). */
  static async resolveTableQrScan(tableId: number, key: string) {
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        counterAccessKey: key,
        isArchived: false,
        isCounter: false,
      },
    });
    if (!table) {
      return { status: "invalid_key" as const };
    }
    return { status: "valid" as const, table };
  }

  /** Read-only — does NOT create a session if none exists (unlike the
   *  pre-draft Table flow this replaced). Lets the browsing/cart UI
   *  show "Round 1 — confirmed, cooking" alongside the draft-adding
   *  UI for whatever round comes next. A terminal session (PAID/
   *  CANCELLED/COMPLETED) is treated the same as "no active round" —
   *  same reasoning markSessionsPaid's own comment describes: the
   *  table's activeSessionId pointer is left as-is on payment, and
   *  every reader is expected to treat a terminal session behind it
   *  as stale rather than requiring a second write to clear it. */
  static async getActiveRoundForTable(tableId: number) {
    const table = await prisma.table.findFirst({
      where: { id: tableId, isArchived: false },
    });
    if (!table?.activeSessionId) return null;

    const current = await prisma.orderSession.findFirst({
      where: { id: table.activeSessionId, isArchived: false },
    });
    if (!current || isSessionTerminal(current.status)) return null;
    return current;
  }

  /** The table's latest round, if the counter turned it down or let it
   *  expire (see shownCancelReason) — for the Table cart page's "wasn't
   *  accepted" screen. The table's activeSessionId keeps pointing at a
   *  round after it ends (see getActiveRoundForTable), so this is that
   *  round read as-is. Read-only; null for anything else. */
  static async getRejectedRoundForTable(tableId: number) {
    const table = await prisma.table.findFirst({
      where: { id: tableId, isArchived: false },
      select: { activeSessionId: true },
    });
    if (!table?.activeSessionId) return null;

    const round = await prisma.orderSession.findFirst({
      where: { id: table.activeSessionId, isArchived: false },
      select: { id: true, orderNumber: true, status: true, cancelReason: true },
    });
    const reason = round
      ? shownCancelReason(round.status, round.cancelReason)
      : null;
    return round && reason
      ? { id: round.id, orderNumber: round.orderNumber, cancelReason: reason }
      : null;
  }

  /** getActiveRoundForTable plus the round's line items — for the
   *  Table cart page, which keeps showing what was just sent to the
   *  kitchen (with the approval status on its button) instead of
   *  going blank once the draft has been merged into a round. */
  static async getActiveRoundWithOrdersForTable(tableId: number) {
    const round = await TableSessionService.getActiveRoundForTable(tableId);
    if (!round) return null;

    const orders = await prisma.order.findMany({
      where: { orderSessionId: round.id, isArchived: false },
      orderBy: { id: "asc" },
      include: ORDER_LINE_INCLUDE,
    });
    return { ...round, orders };
  }

  /** One round of a table's still-open tab, for the receipt page. The
   *  tableId is part of the lookup (not just the id) so a round id from
   *  another table — ids are sequential and guessable — matches nothing;
   *  null covers "no such round", "not this table's" and "already
   *  finished/never submitted" alike (same set getRoundHistoryForTable
   *  lists). The caller still has to have checked the viewer's
   *  contributor token for tableId. */
  static async getRoundDetailForTable(tableId: number, roundId: number) {
    return prisma.orderSession.findFirst({
      where: {
        id: roundId,
        tableId,
        isArchived: false,
        status: { in: ["PENDING_APPROVAL", "PENDING", "COOKING"] },
      },
      include: {
        orders: { ...ACTIVE_ORDER_LINES, orderBy: { id: "asc" } },
      },
    });
  }

  /** "History" page (Table QR only) — lets a customer waiting to pay
   *  review every round already sent to the kitchen for this table's
   *  tab, not just whichever one getActiveRoundForTable calls "the"
   *  active round. Mirrors markSessionsPaid's own grouping: a table's
   *  tab can be several OrderSession rows deep ("Order More" starts a
   *  new round without touching one already cooking), all settled
   *  together in one bill — so this is everything on that bill so far.
   *
   *  Excludes CART (nothing submitted yet — that's the live draft,
   *  shown on the menu/cart pages instead) and every terminal status.
   *  A caller only reaches this after requireContributorToken/
   *  isTokenCurrentForTable passes, and that check itself already goes
   *  stale the moment the table is paid (Table.contributorEpoch bumps
   *  — see its own comment), so in practice "authorized to call this"
   *  and "table's tab is still open" are the same condition; no
   *  PAID/CANCELLED/COMPLETED round can still be legitimately reachable
   *  here. */
  static async getRoundHistoryForTable(tableId: number) {
    return prisma.orderSession.findMany({
      where: {
        tableId,
        isArchived: false,
        status: { in: ["PENDING_APPROVAL", "PENDING", "COOKING"] },
      },
      orderBy: { id: "asc" },
      include: {
        orders: ACTIVE_ORDER_LINES,
      },
    });
  }
}
