import { prisma } from "../utils/prisma";
import { NotFoundError, ValidationError } from "../lib/errors";

// Counter sessions auto-cancel if they've sat unpaid this long — a
// safety net for sessions a cashier never got around to marking PAID,
// not the primary "is this session still good" signal (that's
// status, checked on every resolve). Deliberately generous (café
// order flow is normally done in minutes) since this only exists to
// catch truly abandoned sessions, not to rush anyone.
const COUNTER_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * OrderSession domain — the "receipt" layer that groups Order (line
 * item) rows into one customer-facing order, for both Table QR and
 * Counter QR origins. See order-system-design.md for the full design
 * this implements.
 *
 * This Service intentionally knows nothing about cookies, HTTP, or
 * which QR type triggered a call — that routing logic belongs to the
 * Controller (action.ts / route handlers), per Rule 1 (Services don't
 * depend on framework/transport concerns). This layer only answers
 * "given these ids, what session applies" and "make these state
 * changes," nothing about *how* the caller learned those ids.
 */
export class OrderSessionService {
  static async getSessionById(sessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: sessionId },
      include: { orders: true },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);
    return session;
  }

  // -----------------------------------------------------------------
  // Table QR flow — keyed by Table.activeSessionId, no cookie involved.
  // -----------------------------------------------------------------

  /**
   * Resolves which OrderSession a Table QR scan should use, creating
   * a new one if needed. This is the single entry point the Table QR
   * Controller calls — it encapsulates the "reuse while unpaid,
   * auto-replace once paid" rule from order-system-design.md Section 3, so
   * that rule lives in exactly one place.
   */
  static async resolveTableSession(tableId: number) {
    const table = await prisma.table.findFirst({ where: { id: tableId } });
    if (!table) throw new NotFoundError("Table", tableId);

    if (table.activeSessionId) {
      const currentSession = await prisma.orderSession.findFirst({
        where: { id: table.activeSessionId },
      });

      // currentSession should always exist while activeSessionId is
      // set, but if it's somehow gone (manual DB edit, data issue),
      // fall through to creating a new one rather than crashing —
      // a missing session is equivalent to "table is free."
      if (currentSession && currentSession.status !== "PAID") {
        return currentSession;
      }
    }

    return OrderSessionService.startTableSession(tableId);
  }

  /** Does one thing: creates a fresh session for a table and points
   *  the table at it. Not exported for reuse outside
   *  resolveTableSession/markSessionPaid — callers should always go
   *  through resolveTableSession so the reuse-vs-new decision stays
   *  in one place. Table QR sessions skip the approval gate entirely
   *  — that gate exists only to protect the Counter QR's
   *  guessable-URL entry point (see startCounterSession), and Table
   *  QR has no equivalent risk since it's already scoped to one
   *  physical table a staff member seated the customer at. */
  private static async startTableSession(tableId: number) {
    return prisma.$transaction(async (tx) => {
      const session = await tx.orderSession.create({
        data: { tableId, isCounter: false, status: "CART" },
      });
      await tx.table.update({
        where: { id: tableId },
        data: { activeSessionId: session.id },
      });
      return session;
    });
  }

  // -----------------------------------------------------------------
  // Counter QR flow — keyed by a session id the Controller reads from
  // a cookie, gated by a one-time access-key check on first scan, and
  // requiring cashier approval before ordering is allowed at all.
  // This Service never touches cookies directly (Rule 1); it just
  // tells the caller what to do with the id/key it already has.
  // -----------------------------------------------------------------

  /**
   * First-scan entry point for a Counter QR. Verifies the URL's
   * access key against the table's stored key — this is purely an
   * obfuscation check (stop `?tableId=6` guessing), not a session
   * credential, so it's checked once here and never touched again;
   * the Controller is expected to redirect to a key-free URL right
   * after this succeeds. Throws ValidationError on a bad/missing key
   * so the Controller can fall back to view-only without creating
   * anything.
   */
  static async startCounterSessionFromKey(tableId: number, urlKey: string) {
    const table = await prisma.table.findFirst({
      where: { id: tableId, isCounter: true, isArchived: false },
    });
    if (
      !table ||
      !table.counterAccessKey ||
      table.counterAccessKey !== urlKey
    ) {
      throw new ValidationError("Invalid or expired counter QR link.");
    }

    // Starts in PENDING_APPROVAL, not CART — a cashier has to accept
    // before this customer can add anything. See acceptCounterSession
    // / rejectCounterSession below.
    return prisma.orderSession.create({
      data: {
        tableId: table.id,
        isCounter: true,
        status: "PENDING_APPROVAL",
      },
    });
  }

  /**
   * Resolves which OrderSession a *returning* Counter QR visit should
   * use, given whatever session id the caller found in the customer's
   * cookie. Unlike the Table QR flow, a missing/invalid cookie here
   * does NOT fall back to silently creating a new session — with no
   * access key on this request (that only ever arrives on the first
   * scan, via startCounterSessionFromKey), there's nothing to verify
   * a new session against, so the caller should send the customer to
   * view-only instead of ordering.
   */
  static async resolveCounterSession(cookieSessionId: number) {
    const session = await prisma.orderSession.findFirst({
      where: { id: cookieSessionId },
    });
    if (!session) return null;

    // PAID: order's done, this cookie shouldn't grant anything more.
    // CANCELLED: either a cashier rejected it, or the 12h staleness
    // check below already cancelled it on a previous visit — either
    // way, same "no longer usable" outcome.
    if (session.status === "PAID" || session.status === "CANCELLED") {
      return null;
    }

    if (
      session.status !== "PENDING_APPROVAL" &&
      Date.now() - session.createdAt.getTime() > COUNTER_SESSION_MAX_AGE_MS
    ) {
      // Stale — sat unpaid past the safety-net window. Cancel it so
      // it stops showing up as "active" anywhere (e.g. an Order List
      // Page), then treat this visit as if there were no cookie.
      await prisma.orderSession.update({
        where: { id: session.id },
        data: { status: "CANCELLED" },
      });
      return null;
    }

    return session;
  }

  /** Cashier accepts a pending Counter session — the customer can now
   *  order. Does one thing: the status flip. The Controller is
   *  responsible for the customer-facing cookie, same division of
   *  responsibility as elsewhere in this Service (Rule 1). */
  static async acceptCounterSession(sessionId: number) {
    const session = await OrderSessionService.getSessionById(sessionId);
    if (session.status !== "PENDING_APPROVAL") {
      throw new ValidationError("This session is not waiting for approval.");
    }
    return prisma.orderSession.update({
      where: { id: sessionId },
      data: { status: "CART" },
    });
  }

  /** Cashier rejects a pending Counter session (or it timed out
   *  waiting — same effect either way). Cancels the session; the
   *  Controller sends the customer to view-only and never sets a
   *  cookie for a rejected session in the first place, so there's
   *  nothing else to clean up client-side. */
  static async rejectCounterSession(sessionId: number) {
    const session = await OrderSessionService.getSessionById(sessionId);
    if (session.status !== "PENDING_APPROVAL") {
      throw new ValidationError("This session is not waiting for approval.");
    }
    return prisma.orderSession.update({
      where: { id: sessionId },
      data: { status: "CANCELLED" },
    });
  }

  // -----------------------------------------------------------------
  // Shared — used by whichever flow marks a session paid (cashier
  // action, staff POS, etc.). Encapsulates the "clear the table" side
  // effect so callers don't have to remember it.
  // -----------------------------------------------------------------

  /** Marks a session PAID and, if it was a table session, frees the
   *  table immediately (rather than waiting on a separate staff
   *  "clear" action) — see order-system-design.md Section 3 for why this
   *  can't wait: a second group scanning the same table before staff
   *  manually clears it would otherwise land inside the first
   *  group's already-paid session. */
  static async markSessionPaid(sessionId: number) {
    const session = await OrderSessionService.getSessionById(sessionId);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.orderSession.update({
        where: { id: sessionId },
        data: { status: "PAID" },
      });

      if (session.tableId) {
        await tx.table.updateMany({
          where: { id: session.tableId, activeSessionId: sessionId },
          data: { activeSessionId: null },
        });
      }

      return updated;
    });
  }
}
