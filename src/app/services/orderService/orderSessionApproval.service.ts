import { prisma } from "../../utils/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { orderLinesTotal } from "../../lib/orderTotals";
import { Prisma } from "../../../../prisma/generated/browser";

type Tx = Prisma.TransactionClient;

/**
 * The cashier-approval / kitchen-facing half of the OrderSession
 * domain — everything a Backoffice user (not a customer's own
 * browser) does to an already-created session: approve or reject a
 * Counter order waiting on PENDING_APPROVAL, mark one PAID, expire
 * stale approvals, and list sessions for the Order List page.
 *
 * Split out from OrderSessionService (2026 refactor, orderSession.service.ts
 * had grown to ~620 lines / 20 methods) specifically because every method
 * here has a DIFFERENT caller boundary than the rest of that file: these
 * are only ever called from src/app/backoffice/order/ Controllers, never
 * from a customer-facing cookie-based flow (customer/, table/) or a QR
 * scan Route Handler. Session CREATION and cart-building
 * (resolveTableQrScan, addItemToCart, submitOrderForApproval, etc.)
 * stayed in OrderSessionService — those are tightly coupled to each
 * other (a whole customer-facing flow) in a way this group isn't.
 * startStaffSession stayed there too, even though it's staff-triggered,
 * because it's a session-CREATION method that calls back into
 * startNewCounterSession/startNewTableSession in that file.
 */
export class OrderSessionApprovalService {
  /** Cashier taps Accept on the Backoffice dashboard —
   *  PENDING_APPROVAL -> PENDING (kitchen can start). */
  static async acceptCounterSession(sessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);
    if (session.status !== "PENDING_APPROVAL") {
      throw new ValidationError("This order is not awaiting approval.");
    }

    return prisma.orderSession.update({
      where: { id: sessionId },
      data: { status: "PENDING", approvalExpiresAt: null },
    });
  }

  /** Cashier taps Reject — PENDING_APPROVAL -> CANCELLED. Same
   *  terminal outcome as a timeout (OrderSessionService.getSessionStatus),
   *  just cashier-initiated instead of time-initiated. */
  static async rejectCounterSession(sessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);
    if (session.status !== "PENDING_APPROVAL") {
      throw new ValidationError("This order is not awaiting approval.");
    }

    return prisma.orderSession.update({
      where: { id: sessionId },
      data: { status: "CANCELLED", approvalExpiresAt: null },
    });
  }

  /** Everything that has to happen once a session (or a batch of them)
   *  is written to PAID, inside the SAME transaction as that status
   *  write — both markSessionPaid and markSessionsPaid call this
   *  last, so the post-payment cleanup lives in exactly one place
   *  instead of drifting between the single- and bulk-pay paths.
   *
   *  No stock changes here: drafts (Table QR) and a CART round
   *  (Counter "Order More") were never decremented in the first place
   *  — that only happens at submit (decrementStockForSession /
   *  TableDraftService.submitDraft) — so there's nothing to restore.
   *
   *  a) Table QR — bumps Table.contributorEpoch per distinct tableId
   *     (unchanged logic, moved here from markSessionPaid/
   *     markSessionsPaid — see the epoch bump's own reasoning below),
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
   *     Cancels every CART round on the same bill (root id via
   *     billSessionId ?? id, across both this batch's own sessions and
   *     any sibling round the Order List never even showed) so the
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
      await tx.orderSession.updateMany({
        where: {
          isCounter: true,
          status: "CART",
          isArchived: false,
          OR: [{ id: { in: billIds } }, { billSessionId: { in: billIds } }],
        },
        data: { status: "CANCELLED" },
      });
    }
  }

  /** Marks a session PAID — the single trigger that (a) frees its
   *  table for the next group, since getActiveRoundForTable treats any
   *  terminal session as "no active round" without needing an extra
   *  write here beyond the status change, and (b) makes
   *  the customer's *next* request (page load or poll) the point where
   *  their cookie gets cleared and they're shown read-only browsing
   *  (design doc sections 3 and 6). This Service never touches cookies
   *  itself — cookies are a Route Handler/Server Action concern — the
   *  cashier's browser calling this is a *different* browser from the
   *  customer's, so there is no cookie to clear here even in
   *  principle; the customer-facing endpoint is what reacts to PAID
   *  the next time that browser is heard from.
   *
   *  Everything else this needs cleaned up (contributorEpoch bump,
   *  leftover drafts, sibling CART rounds on the same Counter bill)
   *  lives in cleanUpAfterPayment, called last, inside this same
   *  transaction. */
  static async markSessionPaid(sessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);

    return prisma.$transaction(async (tx) => {
      const paid = await tx.orderSession.update({
        where: { id: sessionId },
        data: { status: "PAID" },
      });
      await OrderSessionApprovalService.cleanUpAfterPayment(tx, [session]);
      return paid;
    });
  }

  /** Bulk version of markSessionPaid — one write for every open round
   *  of a table's tab (see the "Order More" design discussion:
   *  multiple OrderSession rows can now represent multiple rounds for
   *  the same table, so settling a table means paying all of them at
   *  once, not one at a time). A Counter entry's own sessions here are
   *  just whichever rounds the Order List had already surfaced
   *  (PENDING_APPROVAL/PENDING/COOKING) — cleanUpAfterPayment is what
   *  reaches the bill's own CART round(s) that never made it into this
   *  list at all (Problem A).
   *
   *  All post-payment cleanup (contributorEpoch bump, leftover drafts,
   *  sibling CART rounds on the same Counter bill) lives in
   *  cleanUpAfterPayment, called last, inside this same transaction —
   *  see its own comment. */
  static async markSessionsPaid(sessionIds: number[]) {
    if (sessionIds.length === 0) {
      throw new ValidationError("No sessions to mark as paid.");
    }

    const sessions = await prisma.orderSession.findMany({
      where: { id: { in: sessionIds }, isArchived: false },
      select: { id: true, tableId: true, isCounter: true, billSessionId: true },
    });

    return prisma.$transaction(async (tx) => {
      const result = await tx.orderSession.updateMany({
        where: { id: { in: sessionIds }, isArchived: false },
        data: { status: "PAID" },
      });
      await OrderSessionApprovalService.cleanUpAfterPayment(tx, sessions);
      return result;
    });
  }

  /** Batch version of the lazy-expiry check in
   *  OrderSessionService.getSessionStatus — run once at the top of the
   *  Backoffice Order List page load so a timed-out PENDING_APPROVAL
   *  session doesn't still show up asking for a decision the
   *  customer's own polling has already resolved (CANCELLED) on their
   *  end. */
  static async expireStaleApprovals(locationId: number) {
    return prisma.orderSession.updateMany({
      where: {
        locationId,
        status: "PENDING_APPROVAL",
        approvalExpiresAt: { lt: new Date() },
        isArchived: false,
      },
      data: { status: "CANCELLED", approvalExpiresAt: null },
    });
  }

  /** For the Backoffice Order List page (design doc section 5) — every
   *  session at a location still needing staff attention or still
   *  open (awaiting approval, accepted, cooking). CART sessions
   *  (nothing submitted yet) and terminal ones (PAID/CANCELLED/
   *  COMPLETED — already settled) are filtered out at the query level
   *  rather than fetched and ignored, since neither is ever rendered
   *  here anyway — see groupSessionsForDisplay for what happens to
   *  what's left. */
  static async getSessionsForLocation(locationId: number) {
    const sessions = await prisma.orderSession.findMany({
      where: {
        locationId,
        isArchived: false,
        status: { in: ["PENDING_APPROVAL", "PENDING", "COOKING"] },
      },
      orderBy: { id: "desc" },
      include: {
        table: true,
        orders: {
          where: { isArchived: false },
          include: { menu: true, OrdersAddons: { include: { addon: true } } },
        },
      },
    });

    return sessions.map((session) => {
      const total = orderLinesTotal(session.orders);

      return {
        ...session,
        label:
          session.table && !session.isCounter
            ? session.table.name
            : session.orderNumber,
        total,
      };
    });
  }

  /**
   * Groups getSessionsForLocation's flat list into one "entry" per
   * table (or per Counter session — see the key below) for display —
   * see the "Order More" design discussion for why one table can now
   * have several open OrderSession rows (rounds) at once, and why the
   * Order List page needs to show them together with one combined
   * total rather than as unrelated cards.
   *
   * Table QR sessions sharing a tableId are the SAME group (one tab,
   * multiple rounds — "Order More" is what creates a second round for
   * an existing table). Counter QR sessions group per BILL — every
   * round sharing a root id (billSessionId ?? id) is the same group —
   * still never with a different customer's session, including one
   * that happens to share a tableId (the Counter's own table row):
   * each bill is one customer's own phone/own order, so two different
   * customers who picked the same counter must never have their bills
   * merged.
   */
  static groupSessionsForDisplay<
    T extends {
      id: number;
      tableId: number | null;
      isCounter: boolean;
      status: string;
      label: string;
      total: number;
      billSessionId: number | null;
      orderNumber: string;
      approvalExpiresAt: Date | null;
    },
  >(sessions: T[]) {
    const groups = new Map<
      string,
      {
        key: string;
        title: string;
        isTableGroup: boolean;
        hasPendingApproval: boolean;
        /** Earliest approvalExpiresAt among this group's
         *  PENDING_APPROVAL sessions — when the group's most urgent
         *  round times out and auto-cancels. Null if none is pending. */
        earliestApprovalExpiresAt: Date | null;
        combinedTotal: number;
        sessions: T[];
      }
    >();

    for (const session of sessions) {
      const key = session.isCounter
        ? `counter-${session.billSessionId ?? session.id}`
        : `table-${session.tableId}`;

      const pendingExpiry =
        session.status === "PENDING_APPROVAL" ? session.approvalExpiresAt : null;

      const existing = groups.get(key);
      if (existing) {
        existing.sessions.push(session);
        existing.combinedTotal += session.total;
        if (session.status === "PENDING_APPROVAL") {
          existing.hasPendingApproval = true;
        }
        if (
          pendingExpiry &&
          (!existing.earliestApprovalExpiresAt ||
            pendingExpiry < existing.earliestApprovalExpiresAt)
        ) {
          existing.earliestApprovalExpiresAt = pendingExpiry;
        }
        continue;
      }

      groups.set(key, {
        key,
        title: session.label,
        isTableGroup: !session.isCounter,
        hasPendingApproval: session.status === "PENDING_APPROVAL",
        earliestApprovalExpiresAt: pendingExpiry,
        combinedTotal: session.total,
        sessions: [session],
      });
    }

    // A Counter group's title must be the BILL's first round's
    // orderNumber, not whichever round happened to create the group
    // above — sessions arrive newest-first (getSessionsForLocation
    // orders id "desc"), so the session that creates a group is
    // always that group's NEWEST round. Table titles are just the
    // table name (already correct from session.label above,
    // independent of round order).
    for (const group of groups.values()) {
      if (group.isTableGroup) continue;
      const firstRound = group.sessions.reduce((oldest, session) =>
        session.id < oldest.id ? session : oldest,
      );
      group.title = firstRound.orderNumber;
    }

    // Entries with something awaiting a decision surface first — a
    // cashier's most urgent work (Accept/Reject) shouldn't be buried
    // below tables that only need eventual payment. Among those, the
    // one closest to timing out (5-minute auto-cancel) comes first;
    // a pending group with no expiry recorded sorts last of them.
    // Every other group keeps its existing order.
    const allGroups = Array.from(groups.values());
    const waiting = allGroups
      .filter((group) => group.hasPendingApproval)
      .sort(
        (a, b) =>
          (a.earliestApprovalExpiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
          (b.earliestApprovalExpiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
      );
    const rest = allGroups.filter((group) => !group.hasPendingApproval);
    return [...waiting, ...rest];
  }

  /** What the Order List page and an entry's detail page both render
   *  from — expire timed-out approvals, then load and group. One place
   *  so neither page can forget the expiry sweep and show a decision
   *  the customer's own polling has already resolved. */
  static async getOpenEntries(locationId: number) {
    await OrderSessionApprovalService.expireStaleApprovals(locationId);
    const sessions =
      await OrderSessionApprovalService.getSessionsForLocation(locationId);
    return OrderSessionApprovalService.groupSessionsForDisplay(sessions);
  }
}
