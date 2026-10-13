import { prisma } from "@/app/utils/prisma";
import { shownCancelReason } from "@/app/lib/order/roundOutcome";
import {
  ACTIVE_ORDER_LINES,
  CUSTOMER_LINE_OMIT,
  ORDER_LINE_INCLUDE,
} from "./orderLineQuery";
import { Prisma } from "../../../../prisma/generated/browser";
import { AppError } from "@/app/lib/errors";
import {
  toTableDraftRows,
  withdrawBlock,
  WITHDRAW_BLOCK_CODES,
  WITHDRAW_BLOCK_MESSAGES,
} from "@/app/lib/order/withdrawal";
import { TableDraftService } from "../tableDraft.service";
import { isSessionTerminal, OrderSessionService } from "./orderSession.service";

type Tx = Prisma.TransactionClient;

/** Table QR — the scan, and a table's rounds as the customer's pages
 *  show them (active, last rejected, detail, history). Customer rounds
 *  are created by TableDraftService.submitDraft (which also points
 *  Table.activeSessionId at them); staff rounds by
 *  StaffOrderService.submitStaffOrder (which never does). The shared
 *  lifecycle (cancel, status) is OrderSessionService's. */
export class TableSessionService {
  /** Which of a table's rounds belong to the CURRENT tab, for its
   *  customers' history and receipts: every open round (awaiting
   *  approval, accepted, cooking), plus rounds a customer withdrew
   *  ("Cancelled by you") since the table was last settled — an earlier
   *  group's withdrawals never show. Never charged: callers leave
   *  CANCELLED rounds out of their totals. */
  private static async currentTabRounds(
    tableId: number,
  ): Promise<Prisma.OrderSessionWhereInput> {
    const lastSettled = await prisma.orderSession.findFirst({
      where: { tableId, status: { in: ["PAID", "COMPLETED"] } },
      orderBy: { id: "desc" },
      select: { id: true },
    });
    return {
      OR: [
        { status: { in: ["PENDING_APPROVAL", "PENDING", "COOKING"] } },
        {
          status: "CANCELLED",
          cancelReason: "WITHDRAWN",
          id: { gt: lastSettled?.id ?? 0 },
        },
      ],
    };
  }

  /** The table's name for the customer's own screens ("Table 3") — only
   *  a seated table that's still open AT this location; null otherwise.
   *  Selects the name only — never its access key or token epoch. The
   *  caller has checked the viewer's contributor token for it. */
  static async getTableName(tableId: number, locationId: number) {
    const table = await prisma.table.findFirst({
      where: { id: tableId, locationId, isArchived: false, isCounter: false },
      select: { name: true },
    });
    return table?.name ?? null;
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
      omit: CUSTOMER_LINE_OMIT,
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
        ...(await TableSessionService.currentTabRounds(tableId)),
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
   *  shown on the menu/cart pages instead) and every terminal status —
   *  except rounds a customer withdrew in this tab (currentTabRounds),
   *  listed as "Cancelled by you" and never in the total.
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
        ...(await TableSessionService.currentTabRounds(tableId)),
      },
      orderBy: { id: "asc" },
      include: {
        orders: ACTIVE_ORDER_LINES,
      },
    });
  }

  /**
   * "Cancel order" / "Change order" on the Table waiting screen: the
   * table's current round (the one its phones show — Table.activeSessionId)
   * withdrawn while it waits for approval, for EVERYONE at the table —
   * the caller has checked this phone holds the table's current
   * contributor token; never a round named by id. Through
   * cancelSession(…, "WITHDRAWN"), the one cancel writer (stock back, an
   * OrderCancellation row), whose status check settles a race with the
   * cashier: if Accept got there first, nothing is written and the
   * customer is told why (an AppError with WITHDRAW_BLOCK_CODES' code).
   *
   * "change" also, in the SAME transaction, turns the round's lines back
   * into the table's shared draft (TableDraftService.restoreDraftRows),
   * each keeping whose pick it was — so everyone can edit and send again.
   */
  static async withdrawPendingRound(tableId: number, mode: "cancel" | "change") {
    const table = await prisma.table.findFirst({
      where: { id: tableId, isArchived: false, isCounter: false },
      select: { activeSessionId: true },
    });
    const round = table?.activeSessionId
      ? await prisma.orderSession.findFirst({
          where: { id: table.activeSessionId, tableId, isArchived: false },
          // WITH contributorToken (no CUSTOMER_LINE_OMIT): "change" gives
          // each line back to whoever picked it. Never returned from here.
          include: {
            orders: {
              where: { isArchived: false },
              include: ORDER_LINE_INCLUDE,
              orderBy: { id: "asc" },
            },
          },
        })
      : null;
    if (!round) {
      throw new AppError(
        "There's no order waiting at this table.",
        "NO_WAITING_ORDER",
      );
    }
    const block = withdrawBlock(round, new Date());
    if (block) {
      throw new AppError(WITHDRAW_BLOCK_MESSAGES[block], WITHDRAW_BLOCK_CODES[block]);
    }

    const withdrawn = await prisma.$transaction(async (tx: Tx) => {
      const cancelled = await OrderSessionService.cancelSession(
        tx,
        round.id,
        "WITHDRAWN",
      );
      if (cancelled && mode === "change") {
        await TableDraftService.restoreDraftRows(
          tx,
          toTableDraftRows(round.orders, tableId),
        );
      }
      return cancelled;
    });
    if (!withdrawn) {
      // Lost the race — say what happened instead.
      const now = await prisma.orderSession.findUniqueOrThrow({
        where: { id: round.id },
        select: { status: true, isCounter: true, approvalExpiresAt: true },
      });
      const reason = withdrawBlock(now, new Date()) ?? "cancelled";
      throw new AppError(WITHDRAW_BLOCK_MESSAGES[reason], WITHDRAW_BLOCK_CODES[reason]);
    }
    return { sessionId: round.id, orderNumber: round.orderNumber };
  }
}
