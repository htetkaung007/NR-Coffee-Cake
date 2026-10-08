import { prisma } from "@/app/utils/prisma";
import { orderLinesTotal } from "@/app/lib/order/orderTotals";
import { approvalDeadline } from "@/app/lib/approval/approvalDeadline";
import { ACTIVE_ORDER_LINES } from "./orderLineQuery";
import { OrderApprovalService } from "./orderApproval.service";

/** The Backoffice Order List's reads — open sessions for a location
 *  grouped into entries (one per table / counter bill), a single entry,
 *  and the "N need approval" summary. Each read first expires stale
 *  approvals (OrderApprovalService) so nothing shows as waiting past
 *  its deadline. */
export class OrderListService {
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
        // Each add-on's name, for the itemised bill and round cards.
        orders: ACTIVE_ORDER_LINES,
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

  /** The Order List entry (card) a session belongs to — also the
   *  [entryKey] segment of that entry's detail page URL. Table QR rounds
   *  share one entry per table; Counter rounds share one per bill (root
   *  id via billSessionId ?? id) — see groupSessionsForDisplay for why.
   *  The one place this rule lives: grouping, the pending-approval
   *  summary and the Backoffice alert bar all key on it. */
  static entryKeyFor(session: {
    id: number;
    tableId: number | null;
    isCounter: boolean;
    billSessionId: number | null;
  }) {
    return session.isCounter
      ? `counter-${session.billSessionId ?? session.id}`
      : `table-${session.tableId}`;
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
      createdAt: Date;
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
        /** When the group's most urgent PENDING_APPROVAL round is due
         *  (approvalDeadline — Counter: auto-cancels; Table: becomes
         *  overdue). Null if none is pending. */
        earliestApprovalExpiresAt: Date | null;
        /** Whether that most urgent round cancels itself when due
         *  (Counter) or only becomes overdue (Table). */
        earliestApprovalAutoCancels: boolean;
        combinedTotal: number;
        sessions: T[];
      }
    >();

    for (const session of sessions) {
      const key = OrderListService.entryKeyFor(session);

      // null unless the round is awaiting approval (see approvalDeadline).
      const due = approvalDeadline(session);

      const existing = groups.get(key);
      if (existing) {
        existing.sessions.push(session);
        existing.combinedTotal += session.total;
        if (session.status === "PENDING_APPROVAL") {
          existing.hasPendingApproval = true;
        }
        if (
          due &&
          (!existing.earliestApprovalExpiresAt ||
            due.deadline < existing.earliestApprovalExpiresAt)
        ) {
          existing.earliestApprovalExpiresAt = due.deadline;
          existing.earliestApprovalAutoCancels = due.autoCancels;
        }
        continue;
      }

      groups.set(key, {
        key,
        title: session.label,
        isTableGroup: !session.isCounter,
        hasPendingApproval: session.status === "PENDING_APPROVAL",
        earliestApprovalExpiresAt: due?.deadline ?? null,
        earliestApprovalAutoCancels: due?.autoCancels ?? false,
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
    // one whose most urgent round is due first comes first (Counter:
    // auto-cancels then; Table: becomes overdue — so the longest-waiting
    // table rises too); a pending group with no deadline sorts last.
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
    await OrderApprovalService.expireStaleApprovals(locationId);
    const sessions = await OrderListService.getSessionsForLocation(locationId);
    return OrderListService.groupSessionsForDisplay(sessions);
  }

  /** One entry by its key (see entryKeyFor) — behind both the entry's
   *  detail page and its printable bill. Null when it's no longer open
   *  (paid, rejected or expired since it was listed) or the key is
   *  wrong: an optional lookup, since callers show a message or go
   *  back to the list rather than treating it as an error. */
  static async getOpenEntry(locationId: number, entryKey: string) {
    const entries = await OrderListService.getOpenEntries(locationId);
    return entries.find((entry) => entry.key === entryKey) ?? null;
  }

  /** Light read behind the Backoffice-wide new-order alerts (polled
   *  every few seconds from every Backoffice page) — only the rounds
   *  awaiting approval, and only the columns needed to name and link
   *  them; no order lines. Runs the same expiry sweep as getOpenEntries
   *  first, so a timed-out round never raises an alert.
   *
   *  Titles match the Order List's: a Table round shows its table name;
   *  a Counter round shows its BILL's first round's orderNumber, looked
   *  up for every bill in one extra query rather than one per row. */
  static async getPendingApprovalSummary(locationId: number) {
    await OrderApprovalService.expireStaleApprovals(locationId);
    const sessions = await prisma.orderSession.findMany({
      where: { locationId, status: "PENDING_APPROVAL", isArchived: false },
      orderBy: { id: "asc" },
      select: {
        id: true,
        tableId: true,
        isCounter: true,
        billSessionId: true,
        orderNumber: true,
        approvalExpiresAt: true,
        table: { select: { name: true } },
      },
    });

    const billRootIds = [
      ...new Set(
        sessions
          .filter((session) => session.isCounter)
          .map((session) => session.billSessionId)
          .filter((rootId): rootId is number => rootId !== null),
      ),
    ];
    const billRoots =
      billRootIds.length > 0
        ? await prisma.orderSession.findMany({
            where: { id: { in: billRootIds } },
            select: { id: true, orderNumber: true },
          })
        : [];
    const rootOrderNumbers = new Map(
      billRoots.map((root) => [root.id, root.orderNumber]),
    );

    return sessions.map((session) => ({
      sessionId: session.id,
      entryKey: OrderListService.entryKeyFor(session),
      // A first round is its own root (billSessionId null), so it isn't
      // in rootOrderNumbers and falls back to its own orderNumber.
      title: session.isCounter
        ? (rootOrderNumbers.get(session.billSessionId ?? session.id) ??
          session.orderNumber)
        : (session.table?.name ?? session.orderNumber),
      isTableGroup: !session.isCounter,
      approvalExpiresAt: session.approvalExpiresAt,
    }));
  }
}
