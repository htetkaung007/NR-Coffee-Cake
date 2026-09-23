import { prisma } from "../../utils/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";
import { orderLinesTotal } from "../../lib/orderTotals";

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
   *  Table QR only — also bumps Table.contributorEpoch (see its own
   *  comment): every contributor's CONTRIBUTOR_TOKEN_COOKIE entry was
   *  minted under the table's epoch at scan time, so this is what
   *  makes their old tokens read as stale and forces a fresh QR scan
   *  before anyone can start a new draft at this table. Counter
   *  sessions never carry a contributor token to begin with, so
   *  there's nothing to invalidate for them even if tableId happens
   *  to be set. */
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
      if (!session.isCounter && session.tableId) {
        await tx.table.update({
          where: { id: session.tableId },
          data: { contributorEpoch: { increment: 1 } },
        });
      }
      return paid;
    });
  }

  /** Bulk version of markSessionPaid — one write for every open round
   *  of a table's tab (see the "Order More" design discussion:
   *  multiple OrderSession rows can now represent multiple rounds for
   *  the same table, so settling a table means paying all of them at
   *  once, not one at a time). A Counter entry only ever has one
   *  session, so this is also just what a single Mark-as-Paid does
   *  there — same action, same code path either way.
   *
   *  Bumps Table.contributorEpoch once per distinct Table-QR tableId
   *  among these sessions (see markSessionPaid's own comment for why)
   *  — normally exactly one table, since an entry here is already
   *  grouped by table (see groupSessionsForDisplay), but this stays
   *  correct even if that ever changes. */
  static async markSessionsPaid(sessionIds: number[]) {
    if (sessionIds.length === 0) {
      throw new ValidationError("No sessions to mark as paid.");
    }

    const sessions = await prisma.orderSession.findMany({
      where: { id: { in: sessionIds }, isArchived: false },
      select: { tableId: true, isCounter: true },
    });
    const tableIdsToInvalidate = [
      ...new Set(
        sessions
          .filter((session) => !session.isCounter && session.tableId)
          .map((session) => session.tableId as number),
      ),
    ];

    return prisma.$transaction(async (tx) => {
      const result = await tx.orderSession.updateMany({
        where: { id: { in: sessionIds }, isArchived: false },
        data: { status: "PAID" },
      });
      for (const tableId of tableIdsToInvalidate) {
        await tx.table.update({
          where: { id: tableId },
          data: { contributorEpoch: { increment: 1 } },
        });
      }
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
   * an existing table). Counter QR sessions are deliberately NEVER
   * grouped with each other even if they happen to share a tableId —
   * each Counter session is one customer's own phone/own order, and
   * two different customers who picked the same table number at
   * checkout must never have their bills merged.
   */
  static groupSessionsForDisplay<
    T extends {
      id: number;
      tableId: number | null;
      isCounter: boolean;
      status: string;
      label: string;
      total: number;
    },
  >(sessions: T[]) {
    const groups = new Map<
      string,
      {
        key: string;
        title: string;
        isTableGroup: boolean;
        hasPendingApproval: boolean;
        combinedTotal: number;
        sessions: T[];
      }
    >();

    for (const session of sessions) {
      const key = session.isCounter
        ? `counter-${session.id}`
        : `table-${session.tableId}`;

      const existing = groups.get(key);
      if (existing) {
        existing.sessions.push(session);
        existing.combinedTotal += session.total;
        if (session.status === "PENDING_APPROVAL") {
          existing.hasPendingApproval = true;
        }
        continue;
      }

      groups.set(key, {
        key,
        title: session.label,
        isTableGroup: !session.isCounter,
        hasPendingApproval: session.status === "PENDING_APPROVAL",
        combinedTotal: session.total,
        sessions: [session],
      });
    }

    // Entries with something awaiting a decision surface first — a
    // cashier's most urgent work (Accept/Reject) shouldn't be buried
    // below tables that only need eventual payment.
    return Array.from(groups.values()).sort(
      (a, b) => Number(b.hasPendingApproval) - Number(a.hasPendingApproval),
    );
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
