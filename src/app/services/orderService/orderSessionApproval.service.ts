import { prisma } from "../../utils/prisma";
import { NotFoundError, ValidationError } from "../../lib/errors";

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
   *  table for the next group, since resolveTableSession treats any
   *  terminal session as "start fresh" on the very next scan, with no
   *  extra write needed here beyond the status change, and (b) makes
   *  the customer's *next* request (page load or poll) the point where
   *  their cookie gets cleared and they're shown read-only browsing
   *  (design doc sections 3 and 6). This Service never touches cookies
   *  itself — cookies are a Route Handler/Server Action concern — the
   *  cashier's browser calling this is a *different* browser from the
   *  customer's, so there is no cookie to clear here even in
   *  principle; the customer-facing endpoint is what reacts to PAID
   *  the next time that browser is heard from. */
  static async markSessionPaid(sessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);

    return prisma.orderSession.update({
      where: { id: sessionId },
      data: { status: "PAID" },
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
   *  active/recent session at a location, with its line items and the
   *  display label already resolved (table name vs generated order
   *  number, per the doc's table). */
  static async getSessionsForLocation(locationId: number) {
    const sessions = await prisma.orderSession.findMany({
      where: { locationId, isArchived: false },
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
      const total = session.orders.reduce((sum, order) => {
        const addonsTotal = order.OrdersAddons.reduce(
          (addonSum, link) => addonSum + link.addon.price,
          0,
        );
        return sum + order.menu.price * order.quantity + addonsTotal;
      }, 0);

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
}
