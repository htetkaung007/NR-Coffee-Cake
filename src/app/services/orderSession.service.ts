import { prisma } from "../utils/prisma";
import type { Prisma } from "../../../prisma/generated/client";
import { NotFoundError, ValidationError } from "../lib/errors";
import { TableService } from "./table.service";

type Tx = Prisma.TransactionClient;

// A session that has reached one of these statuses is "done" — a new
// scan (Table QR) or a new cookie-matched visit (Counter QR) must not
// land inside it anymore. PAID is the expected/common case (design doc
// section 3). COMPLETED and CANCELLED are treated the same way here so
// a cancelled or already-served session can't silently keep a table or
// a customer's cookie locked forever.
const TERMINAL_STATUSES = ["PAID", "COMPLETED", "CANCELLED"] as const;

/** The single definition of "is this session done" — exported so
 *  Controllers (page.tsx / action.ts) ask the Service instead of each
 *  keeping their own copy of TERMINAL_STATUSES, which would drift out
 *  of sync the moment one of them is updated and the others aren't
 *  (Rule 1: Service owns business logic, Controller stays thin). */
export function isSessionTerminal(status: string) {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}

const APPROVAL_WINDOW_MINUTES = 10;

// A session still sitting in CART this long after being created — no
// order ever submitted through it — is treated as abandoned (customer
// scanned and never came back to it). Checked lazily wherever a
// session is resolved from its cookie (getActiveSessionByToken), never
// on a timer: there's no polling while a session is still CART (the
// customer's client only polls once PENDING_APPROVAL — see
// CounterOrderClient), so in practice this gets noticed the next time
// the customer's browser makes any request — a page reload, or an
// add-to-cart/submit attempt — not the instant the 40 minutes elapse.
const CART_ABANDON_MINUTES = 2;

/** A session that has ever left CART (submitted at least once, even
 *  if that submission was later rejected) is no longer at risk of
 *  being treated as "abandoned" — see CART_ABANDON_MINUTES. Only a
 *  session that has NEVER been submitted can still be sitting in CART
 *  by the time this runs, so checking the current status is enough;
 *  no separate "has this ever been submitted" flag is needed. */
function isAbandonedCart(session: { status: string; createdAt: Date }) {
  if (session.status !== "CART") return false;
  const ageMs = Date.now() - session.createdAt.getTime();
  return ageMs > CART_ABANDON_MINUTES * 60_000;
}

/** Placeholder scheme — see design doc section 9 ("orderNumber
 *  generation strategy not yet decided"). Swap this one function for a
 *  per-location daily counter later; nothing else needs to change. */
function generateOrderNumber(sessionId: number) {
  return `#A${String(sessionId).padStart(3, "0")}`;
}

/**
 * OrderSession domain — the layer that groups Order (line-item) rows
 * into one customer-facing receipt, resolves which session a QR scan
 * or a returning cookie should land in, and runs the cashier-approval
 * workflow for Counter orders.
 *
 * Table QR and Counter QR are still two distinct scan entry points
 * (resolveTableQrScan / resolveCounterQrScan) — unlike the cookie
 * question, Counter now also requires a rotating key check that Table
 * doesn't, so a single shared entry point would need to special-case
 * around that anyway. Both funnel into resolveTableSession /
 * resolveCounterSession for the actual reuse-vs-new-session decision.
 */
export class OrderSessionService {
  /** Table QR (design doc section 3) — Table.activeSessionId is the
   *  single source of truth for "which session this table's group is
   *  currently in". No cookie, no key: the physical QR is permanent
   *  and every scan of it is trusted to belong to whoever is at that
   *  physical table. */
  static async resolveTableQrScan(tableId: number) {
    const table = await prisma.table.findFirst({
      where: { id: tableId, isArchived: false, isCounter: false },
    });
    if (!table) throw new NotFoundError("Table", tableId);

    return OrderSessionService.resolveTableSession(table);
  }

  static async resolveTableSession(table: {
    id: number;
    locationId: number;
    activeSessionId: number | null;
  }) {
    if (table.activeSessionId) {
      const current = await prisma.orderSession.findFirst({
        where: { id: table.activeSessionId, isArchived: false },
      });
      if (current && !isSessionTerminal(current.status)) {
        return { status: "active" as const, session: current };
      }
    }

    const session = await OrderSessionService.startNewTableSession(table);
    return { status: "active" as const, session };
  }

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

  /** Counter QR — the printed URL carries a rotating `key`
   *  (Table.counterAccessKey). This is checked FIRST, before cookie logic
   *  even runs: a wrong/stale key (old reprint, tampered URL) is
   *  rejected outright rather than falling through to session
   *  resolution. Returns "invalid_key" rather than throwing, so the
   *  Route Handler can fail closed to a generic error/view-only page
   *  without leaking *why* it failed. */
  static async resolveCounterQrScan(
    tableId: number,
    key: string,
    cookieToken: string | null,
  ) {
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        counterAccessKey: key,
        isArchived: false,
        isCounter: true,
      },
    });
    if (!table) {
      return { status: "invalid_key" as const };
    }

    return OrderSessionService.resolveCounterSession(
      table.locationId,
      table.id,
      cookieToken,
    );
  }

  /** Counter QR (design doc section 4). Session identity is carried by
   *  a browser cookie (OrderSession.token, an opaque cuid — never the
   *  numeric id) instead of the Table row, since many unrelated
   *  customers share the same physical Counter QR.
   *
   *  Deliberately does NOT auto-start a new session once the cookie's
   *  session is terminal (e.g. PAID) — and there is NO customer-facing
   *  way to reopen it either. Once a cookie's order is paid, that
   *  browser is permanently shown the read-only menu view (design doc
   *  section 6) until either (a) the cookie's 24h expiry passes and
   *  the very next visit is treated as a first-time scan, or (b) staff
   *  place a new order for that customer directly (design doc section
   *  7). There is no online payment at this business, so a
   *  self-service "order again" affordance on a cookie the server
   *  can't verify is physically at the counter would let a
   *  paid-and-gone customer's browser place further orders no one
   *  asked for. */
  static async resolveCounterSession(
    locationId: number,
    counterTableId: number,
    cookieToken: string | null,
  ) {
    if (!cookieToken) {
      const session = await OrderSessionService.startNewCounterSession(
        locationId,
        counterTableId,
      );
      return { status: "active" as const, session };
    }

    const current = await prisma.orderSession.findFirst({
      where: { token: cookieToken, isArchived: false },
    });

    if (!current) {
      // Cookie pointed at a session that no longer exists — treat as
      // a first visit rather than erroring out.
      const session = await OrderSessionService.startNewCounterSession(
        locationId,
        counterTableId,
      );
      return { status: "active" as const, session };
    }

    if (!isSessionTerminal(current.status)) {
      return { status: "active" as const, session: current };
    }

    // Terminal and no way back for this browser — see the method
    // comment above. The caller should clear the cookie (Max-Age=0)
    // and render/redirect to the read-only menu view.
    return { status: "locked" as const, lastSession: current };
  }

  /** Read-only lookup for a page load that already has a cookie (i.e.
   *  after the scan Route Handler has already run) — unlike
   *  resolveCounterSession, this never starts a new session; it just
   *  reports what the cookie currently points to (or null). Includes
   *  the session's current cart/order rows so the page has everything
   *  it needs in one call. */
  static async getSessionByToken(token: string) {
    return prisma.orderSession.findFirst({
      where: { token, isArchived: false },
      include: {
        orders: {
          where: { isArchived: false },
          include: { menu: true },
          orderBy: { id: "asc" },
        },
      },
    });
  }

  /** "Give me a usable session for this token, or nothing" — the one
   *  place Controllers (page.tsx / action.ts) should ask this,
   *  instead of each combining getSessionByToken with their own
   *  terminal-status check. Null covers "no such session", "session
   *  exists but is terminal", AND "session has sat unsubmitted in
   *  CART past the abandonment window" (see isAbandonedCart) — a
   *  Controller redirecting/erroring on a cookie doesn't need to
   *  distinguish any of those cases, it just has nothing usable
   *  either way. */
  static async getActiveSessionByToken(token: string) {
    const session = await OrderSessionService.getSessionByToken(token);
    if (!session) return null;

    if (isAbandonedCart(session)) {
      await prisma.orderSession.update({
        where: { id: session.id },
        data: { status: "CANCELLED" },
      });
      return null;
    }

    if (isSessionTerminal(session.status)) return null;
    return session;
  }

  /** Adds one line item to a session's cart — only while the session
   *  is still CART (i.e. before "Submit Order"); refuses once it's
   *  PENDING_APPROVAL or beyond, since editing an order the cashier
   *  is already looking at would be confusing at best. */
  static async addItemToCart(
    sessionId: number,
    tableId: number,
    menuId: number,
    quantity: number,
  ) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);
    if (session.status !== "CART") {
      throw new ValidationError("This order can no longer be edited.");
    }

    return prisma.order.create({
      data: {
        menuId,
        quantity,
        tableId,
        orderSessionId: sessionId,
        status: "CART",
      },
    });
  }

  static async startNewCounterSession(
    locationId: number,
    counterTableId: number,
  ) {
    return prisma.$transaction(async (tx: Tx) => {
      const session = await tx.orderSession.create({
        data: {
          locationId,
          tableId: counterTableId,
          isCounter: true,
          status: "CART",
          orderNumber: "",
        },
      });

      return tx.orderSession.update({
        where: { id: session.id },
        data: { orderNumber: generateOrderNumber(session.id) },
      });
    });
  }

  /** Customer taps "Submit Order" — CART -> PENDING_APPROVAL, starting
   *  the 2-minute cashier-approval window (design doc "Step 4").
   *  Refuses anything not currently CART so a double-submit (e.g. a
   *  second tap before the UI updates) can't restart the timer or
   *  re-queue an already-pending order. */
  static async submitOrderForApproval(sessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);
    if (session.status !== "CART") {
      throw new ValidationError(
        "This order has already been submitted or is no longer editable.",
      );
    }

    const approvalExpiresAt = new Date(
      Date.now() + APPROVAL_WINDOW_MINUTES * 60_000,
    );

    return prisma.orderSession.update({
      where: { id: sessionId },
      data: { status: "PENDING_APPROVAL", approvalExpiresAt },
    });
  }

  /** Read path for the customer's polling endpoint (design doc "Step
   *  3: poll every 3-5 seconds"). Lazily expires a stale
   *  PENDING_APPROVAL session on read rather than needing a
   *  background job — the same pattern as the terminal-session checks
   *  elsewhere in this Service: nothing runs on a timer, expiry is
   *  just "is it past due" checked wherever the status is read. */
  static async getSessionStatus(sessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId, isArchived: false },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);

    const isPastApprovalWindow =
      session.status === "PENDING_APPROVAL" &&
      session.approvalExpiresAt !== null &&
      session.approvalExpiresAt < new Date();

    if (isPastApprovalWindow) {
      return prisma.orderSession.update({
        where: { id: sessionId },
        data: { status: "CANCELLED", approvalExpiresAt: null },
      });
    }

    return session;
  }

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
   *  terminal outcome as a timeout (getSessionStatus), just
   *  cashier-initiated instead of time-initiated. */
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
      ? OrderSessionService.startNewCounterSession(table.locationId, table.id)
      : OrderSessionService.startNewTableSession(table);
  }

  /** Batch version of the lazy-expiry check in getSessionStatus — run
   *  once at the top of the Backoffice Order List page load so a
   *  timed-out PENDING_APPROVAL session doesn't still show up asking
   *  for a decision the customer's own polling has already resolved
   *  (CANCELLED) on their end. */
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
