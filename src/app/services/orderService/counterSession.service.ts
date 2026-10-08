import { prisma } from "@/app/utils/prisma";
import { Prisma } from "../../../../prisma/generated/browser";
import { orderLinesTotal } from "@/app/lib/order/orderTotals";
import { ACTIVE_ORDER_LINES } from "./orderLineQuery";
import {
  OrderSessionService,
  generateOrderNumber,
  isAbandonedCart,
  isSessionTerminal,
} from "./orderSession.service";

type Tx = Prisma.TransactionClient;

/** Counter QR — the scan, the session behind the customer's cookie
 *  (each phone its own), and the bill those rounds add up to. The shared
 *  lifecycle (cancel, submit, next round) is OrderSessionService's. */
export class CounterSessionService {
  /** For a session whose bill was split into multiple rounds
   *  (billSessionId set) — the bill's first round ("root"), but only
   *  if it's still open. Used the moment THIS session has just gone
   *  terminal (rejected, timed out, or paid) to decide whether the
   *  customer's cookie/scan should recover onto a still-open sibling
   *  round instead of being treated as "nothing left" (see
   *  pollOrderStatusAction and resolveCounterSession, both of which
   *  call this before clearing a cookie or locking a scan).
   *
   *  Returns null in two cases: billSessionId is null (this session
   *  IS the bill's own first round — there's nothing before it to
   *  recover onto), or the root itself is also terminal (e.g. the
   *  whole bill was just paid together — see cleanUpAfterPayment,
   *  which is exactly what keeps this from ever finding a stale
   *  "open" root after a payment). */
  static async getOpenBillRoot(session: { billSessionId: number | null }) {
    if (session.billSessionId === null) return null;

    const root = await prisma.orderSession.findFirst({
      where: { id: session.billSessionId, isArchived: false },
    });
    if (!root || isSessionTerminal(root.status)) return null;
    return root;
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

    return CounterSessionService.resolveCounterSession(
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
      const session = await CounterSessionService.startNewCounterSession(
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
      const session = await CounterSessionService.startNewCounterSession(
        locationId,
        counterTableId,
      );
      return { status: "active" as const, session };
    }

    if (!isSessionTerminal(current.status)) {
      return { status: "active" as const, session: current };
    }

    // Terminal, but this might just be one round of a still-open bill
    // going terminal on its own (Rejected/timed-out "Order More"
    // round — see getOpenBillRoot) rather than the whole bill being
    // settled — recover onto the bill's still-open first round
    // instead of locking the customer out of a bill that was never
    // actually paid.
    const root = await CounterSessionService.getOpenBillRoot(current);
    if (root) {
      return { status: "active" as const, session: root };
    }

    // Terminal and no way back for this browser — see the method
    // comment above. The caller should clear the cookie (Max-Age=0)
    // and render/redirect to the read-only menu view.
    return { status: "locked" as const, lastSession: current };
  }

  /** Counter QR's counterpart to getRoundHistoryForTable — "Order
   *  More" splits one bill into several OrderSession rounds (see
   *  billSessionId's own schema comment), but the customer should see
   *  ONE bill number and ONE running total throughout, the same way
   *  the cashier's Order List card already does (see
   *  OrderListService.groupSessionsForDisplay). Every
   *  Counter customer screen that used to show a round's own
   *  orderNumber calls this instead.
   *
   *  billNumber is the root round's orderNumber — the session ITSELF
   *  if billSessionId is null (it IS the bill's first round), looked
   *  up fresh rather than trusted from the caller so this stays
   *  correct even if the caller only has a stale/partial session row.
   *
   *  rounds mirrors getRoundHistoryForTable exactly (same status
   *  filter, same orders include, oldest first) so the same history
   *  UI (OrderHistoryCard) can render either one — root plus every
   *  round whose billSessionId equals the root's id, excluding CART
   *  (nothing submitted yet) and every terminal status.
   *
   *  combinedTotal reuses orderLinesTotal per round — no separate
   *  total math (Rule: reuse orderTotals helpers). */
  static async getBillForSession(session: {
    id: number;
    billSessionId: number | null;
  }) {
    const rootId = session.billSessionId ?? session.id;

    const [root, rounds] = await Promise.all([
      prisma.orderSession.findFirst({
        where: { id: rootId, isArchived: false },
      }),
      prisma.orderSession.findMany({
        where: {
          OR: [{ id: rootId }, { billSessionId: rootId }],
          isArchived: false,
          status: { in: ["PENDING_APPROVAL", "PENDING", "COOKING"] },
        },
        orderBy: { id: "asc" },
        include: {
          orders: ACTIVE_ORDER_LINES,
        },
      }),
    ]);

    const billNumber = root?.orderNumber ?? generateOrderNumber(rootId);
    const combinedTotal = rounds.reduce(
      (sum, round) => sum + orderLinesTotal(round.orders),
      0,
    );

    return { billNumber, rounds, combinedTotal };
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
        orders: { ...ACTIVE_ORDER_LINES, orderBy: { id: "asc" } },
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
    const session = await CounterSessionService.getSessionByToken(token);
    if (!session) return null;

    if (isAbandonedCart(session)) {
      await prisma.$transaction((tx: Tx) =>
        OrderSessionService.cancelSession(tx, session.id, "UNSUBMITTED"),
      );
      return null;
    }

    if (isSessionTerminal(session.status)) return null;
    return session;
  }

  /** getActiveSessionByToken's answer WITHOUT its write: an abandoned
   *  CART session reads as null here but is left for
   *  getActiveSessionByToken to cancel. For read-only checks (e.g. the
   *  cart page's "can this browser send?"), which must never change
   *  anything. */
  static async peekActiveSessionByToken(token: string) {
    const session = await CounterSessionService.getSessionByToken(token);
    if (!session) return null;
    if (isAbandonedCart(session) || isSessionTerminal(session.status)) {
      return null;
    }
    return session;
  }

  /** Adds one line item to a session's cart — only while the session
   *  is still CART (i.e. before "Submit Order"); refuses once it's
   *  PENDING_APPROVAL or beyond, since editing an order the cashier
   *  is already looking at would be confusing at best. */
  /** addonIds is the FLAT list of every addon the customer picked
   *  across all of this menu's addon categories (required + optional
   *  combined) — the client doesn't need to group them by category to
   *  call this, but the SERVER re-derives the grouping from
   *  MenuAddonCategories to validate required-category selection.
   *  This validation is a security boundary, not just UX polish: the
   *  client-side "Add to Cart" button being disabled until required
   *  categories are picked can be bypassed by anyone calling this
   *  action directly, so the real enforcement has to live here (same
   *  reasoning as requireSessionFromCookie in customer/menu/action.ts). */

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
}
