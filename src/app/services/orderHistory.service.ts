import { prisma } from "../utils/prisma";
import { NotFoundError, ValidationError } from "../lib/errors";
import {
  buildEntryBill,
  orderLinesTotal,
} from "../lib/order/orderTotals";
import { dayRangeUtc, toShopDay } from "../lib/shopDay";
import {
  toCancellationDetail,
  type CancellationDetail,
} from "../lib/order/cancellation";
import { summarizeRejectReasons } from "../lib/order/rejectReason";
import { Prisma } from "../../../prisma/generated/client";
import { effectiveItemCount } from "../lib/order/voids";
import {
  SENT_CANCEL_REASONS,
  SHOP_MISSED_CANCEL_REASONS,
} from "../lib/order/cancelReason";
import {
  LINE_VOID_QUANTITIES,
  STAFF_LINE_VOIDS,
} from "./orderService/orderLineQuery";

/** A page of cursor-paginated rows, oldest-cursor-last — see
 *  encodeCursor/decodeCursor. */
interface Page<Item> {
  items: Item[];
  nextCursor: string | null;
}

interface ListArgs {
  locationId: number;
  day: string;
  search?: string;
  cursor?: string;
  limit?: number;
}

const DEFAULT_PAGE_SIZE = 20;

/**
 * Read-only history for the Backoffice Order History page — paid bills
 * and cancelled (REJECTED/EXPIRED) rounds, both scoped to one shop day
 * at a time. BillService stays the write side (createForPaidSessions);
 * nothing here ever creates or mutates a row (Rule 14 — a different
 * reason to change: reporting/search queries, not payment workflow).
 */

/** The OrderCancellation fields History shows (turned into a reason + a
 *  wait by toCancellationDetail) — a relation include on the same
 *  query, never a per-row lookup. */
const cancellationSelect = {
  requestedAt: true,
  decidedAt: true,
  rejectReason: true,
  note: true,
} as const;
export class OrderHistoryService {
  /** "Table X" / "Counter" — the one place this label is decided, from
   *  a round's own isCounter flag (never table.isCounter — a round's
   *  OWN channel at the time it was placed is what the history page
   *  describes, matching entryKeyFor's reasoning elsewhere). */
  private static titleFor(session: {
    isCounter: boolean;
    table: { name: string } | null;
  }) {
    return !session.isCounter && session.table ? session.table.name : "Counter";
  }

  /** Opaque (paidAt|updateTime, id) pagination cursor — base64 so it's
   *  a plain string across the Server Action boundary, never exposing
   *  a raw timestamp/id pair the client could hand-edit into a
   *  different page's data. Shared by both list methods below since
   *  the shape (a Date sort key + a tie-breaking id) is identical. */
  private static encodeCursor(sortKey: Date, id: number) {
    return Buffer.from(
      JSON.stringify({ sortKey: sortKey.toISOString(), id }),
    ).toString("base64");
  }

  /** Throws ValidationError on anything malformed rather than letting
   *  a hand-edited/corrupted cursor crash the query — the caller (the
   *  Controller) surfaces that as a normal action error, not a 500. */
  private static decodeCursor(cursor: string): { sortKey: Date; id: number } {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, "base64").toString("utf8"),
      );
      const sortKey = new Date(decoded.sortKey);
      if (typeof decoded.id !== "number" || Number.isNaN(sortKey.getTime())) {
        throw new Error("Malformed cursor payload.");
      }
      return { sortKey, id: decoded.id };
    } catch {
      throw new ValidationError("Invalid pagination cursor.");
    }
  }

  /** Case-insensitive "contains" — the one place that Prisma filter
   *  shape is written, reused across every search field below. */
  private static containsInsensitive(value: string): Prisma.StringFilter {
    return { contains: value, mode: "insensitive" };
  }

  /** Bills paid at this location on this shop day — see dayRangeUtc for
   *  what "this shop day" means. Cursor pagination on (paidAt, id), not
   *  offset, since offset pagination drifts under a list that keeps
   *  growing (more bills getting paid) while a cashier is paging
   *  through it. Uses the Bill(locationId, paidAt) index. */
  static async listPaidBills({
    locationId,
    day,
    search,
    cursor,
    limit = DEFAULT_PAGE_SIZE,
  }: ListArgs): Promise<
    Page<{
      id: number;
      billNumber: string;
      total: number;
      paidAt: Date;
      title: string;
      isCounter: boolean;
      openedAt: Date;
      itemCount: number;
      orderNumbers: string[];
    }>
  > {
    const { start, end } = dayRangeUtc(day);
    const trimmedSearch = search?.trim();

    const conditions: Prisma.BillWhereInput[] = [
      { locationId },
      { paidAt: { gte: start, lt: end } },
    ];
    if (trimmedSearch) {
      conditions.push({
        OR: [
          {
            billNumber: OrderHistoryService.containsInsensitive(trimmedSearch),
          },
          {
            sessions: {
              some: {
                orderNumber:
                  OrderHistoryService.containsInsensitive(trimmedSearch),
              },
            },
          },
          {
            sessions: {
              some: {
                table: {
                  name: OrderHistoryService.containsInsensitive(trimmedSearch),
                },
              },
            },
          },
        ],
      });
    }
    if (cursor) {
      const after = OrderHistoryService.decodeCursor(cursor);
      conditions.push({
        OR: [
          { paidAt: { lt: after.sortKey } },
          { paidAt: after.sortKey, id: { lt: after.id } },
        ],
      });
    }

    const bills = await prisma.bill.findMany({
      where: { AND: conditions },
      orderBy: [{ paidAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        sessions: {
          where: { isArchived: false },
          orderBy: { id: "asc" },
          select: {
            id: true,
            orderNumber: true,
            createdAt: true,
            isCounter: true,
            table: { select: { name: true } },
            orders: {
              where: { isArchived: false },
              select: { quantity: true, voids: LINE_VOID_QUANTITIES },
            },
          },
        },
      },
    });

    const hasMore = bills.length > limit;
    const page = hasMore ? bills.slice(0, limit) : bills;

    const items = page.map((bill) => {
      const firstRound = bill.sessions[0] ?? null;
      return {
        id: bill.id,
        billNumber: bill.billNumber,
        total: bill.total,
        paidAt: bill.paidAt,
        title: firstRound
          ? OrderHistoryService.titleFor(firstRound)
          : "Counter",
        isCounter: firstRound?.isCounter ?? true,
        openedAt: firstRound?.createdAt ?? bill.createdAt,
        // Voided units left out (lib/order/voids).
        itemCount: effectiveItemCount(bill.sessions.flatMap((s) => s.orders)),
        orderNumbers: bill.sessions.map((s) => s.orderNumber),
      };
    });

    const last = page[page.length - 1];
    return {
      items,
      nextCursor:
        hasMore && last
          ? OrderHistoryService.encodeCursor(last.paidAt, last.id)
          : null,
    };
  }

  /** Whole-day totals for the Paid tab's header — ignores `search` on
   *  purpose (a summary describes the day, not a filtered view of it).
   *  One aggregate query: Bill already stores `total` per row (a money
   *  snapshot, see Bill's own schema comment), so this never needs to
   *  re-walk lines/add-ons the way the cancelled summary below does. */
  static async getPaidSummary({
    locationId,
    day,
  }: {
    locationId: number;
    day: string;
  }) {
    const { start, end } = dayRangeUtc(day);
    const aggregate = await prisma.bill.aggregate({
      where: { locationId, paidAt: { gte: start, lt: end } },
      _count: { _all: true },
      _sum: { total: true },
    });

    const bills = aggregate._count._all;
    const revenue = aggregate._sum.total ?? 0;
    return {
      bills,
      revenue,
      avgBill: bills > 0 ? Math.round(revenue / bills) : 0,
    };
  }

  /** Rounds cancelled at this location on this shop day — sent rounds
   *  only (SENT_CANCEL_REASONS: REJECTED / EXPIRED, and WITHDRAWN — a
   *  customer cancelled it while it waited, shown "Cancelled by
   *  customer"): those are the only rounds whose stock was ever
   *  actually decremented (see OrderSessionService.cancelSession). UNSUBMITTED (never sent) and null (pre-cancelReason
   *  history) are deliberately excluded — an abandoned cart was never
   *  really an order. `updateTime` doubles as "when cancelled" because
   *  cancelSession's write is the last write a cancelled round ever
   *  gets. Uses the OrderSession(locationId, status) index. */
  static async listCancelledRounds({
    locationId,
    day,
    search,
    cursor,
    limit = DEFAULT_PAGE_SIZE,
  }: ListArgs): Promise<
    Page<{
      id: number;
      orderNumber: string;
      title: string;
      isCounter: boolean;
      reason: string;
      /** The round's OrderCancellation details; null when it was
       *  cancelled before those were recorded. */
      cancellation: CancellationDetail | null;
      cancelledAt: Date;
      createdAt: Date;
      itemCount: number;
      amount: number;
    }>
  > {
    const { start, end } = dayRangeUtc(day);
    const trimmedSearch = search?.trim();

    const conditions: Prisma.OrderSessionWhereInput[] = [
      { locationId },
      { isArchived: false },
      { status: "CANCELLED" },
      { cancelReason: { in: [...SENT_CANCEL_REASONS] } },
      { updateTime: { gte: start, lt: end } },
    ];
    if (trimmedSearch) {
      conditions.push({
        OR: [
          {
            orderNumber: OrderHistoryService.containsInsensitive(trimmedSearch),
          },
          {
            table: {
              name: OrderHistoryService.containsInsensitive(trimmedSearch),
            },
          },
        ],
      });
    }
    if (cursor) {
      const after = OrderHistoryService.decodeCursor(cursor);
      conditions.push({
        OR: [
          { updateTime: { lt: after.sortKey } },
          { updateTime: after.sortKey, id: { lt: after.id } },
        ],
      });
    }

    const sessions = await prisma.orderSession.findMany({
      where: { AND: conditions },
      orderBy: [{ updateTime: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        table: { select: { name: true } },
        cancellation: { select: cancellationSelect },
        orders: {
          where: { isArchived: false },
          select: {
            quantity: true,
            unitPrice: true,
            OrdersAddons: { select: { unitPrice: true } },
            voids: LINE_VOID_QUANTITIES,
          },
        },
      },
    });

    const hasMore = sessions.length > limit;
    const page = hasMore ? sessions.slice(0, limit) : sessions;

    const items = page.map((session) => ({
      id: session.id,
      orderNumber: session.orderNumber,
      title: OrderHistoryService.titleFor(session),
      isCounter: session.isCounter,
      // Guaranteed non-null by the cancelReason filter above.
      reason: session.cancelReason as string,
      cancellation: toCancellationDetail(session.cancellation),
      cancelledAt: session.updateTime,
      createdAt: session.createdAt,
      itemCount: effectiveItemCount(session.orders),
      amount: orderLinesTotal(session.orders),
    }));

    const last = page[page.length - 1];
    return {
      items,
      nextCursor:
        hasMore && last
          ? OrderHistoryService.encodeCursor(last.updateTime, last.id)
          : null,
    };
  }

  /** Whole-day totals for the Cancelled tab's header — the same rounds
   *  listCancelledRounds lists (customer withdrawals included), `search`
   *  ignored for the same reason getPaidSummary ignores it. The
   *  counting itself is getCancelledSummaryForRange, shared with the
   *  Backoffice reports. */
  static async getCancelledSummary({
    locationId,
    day,
  }: {
    locationId: number;
    day: string;
  }) {
    const { start, end } = dayRangeUtc(day);
    const summary = await OrderHistoryService.getCancelledSummaryForRange({
      locationId,
      start,
      end,
    });
    // The tab lists every sent round that was cancelled, so its header
    // counts (and sums) them all.
    return {
      count: summary.count + summary.withdrawn,
      notCharged: summary.notCharged + summary.withdrawnValue,
    };
  }

  /** THE rule for "cancelled at this location in [start, end)": sent
   *  rounds (see listCancelledRounds), counted by when they were
   *  cancelled (updateTime). `reasons` narrows it — the Reports'
   *  cancelled-lines export passes SHOP_MISSED_CANCEL_REASONS so its
   *  lines add up to the Cancelled card's Not charged. Shared by the
   *  summary below (History header, the Reports Cancelled card) and that
   *  export, so the two can never pick different rounds. */
  static cancelledInRange({
    locationId,
    start,
    end,
    reasons = SENT_CANCEL_REASONS,
  }: {
    locationId: number;
    start: Date;
    end: Date;
    reasons?: readonly ("REJECTED" | "EXPIRED" | "WITHDRAWN")[];
  }): Prisma.OrderSessionWhereInput {
    return {
      locationId,
      isArchived: false,
      status: "CANCELLED",
      cancelReason: { in: [...reasons] },
      updateTime: { gte: start, lt: end },
    };
  }

  /** What was cancelled at this location in [start, end) — the one
   *  definition behind the Order History Cancelled tab's header (one day,
   *  see getCancelledSummary) and the reports' "Not charged" figures (a
   *  week or month), counted by when they were cancelled. `count`,
   *  `rejected`, `timedOut` and `notCharged` are the shop's misses only
   *  (REJECTED / EXPIRED); a customer's own withdrawal isn't one, so it's
   *  counted apart (`withdrawn`, `withdrawnValue`). No stored total on
   *  OrderSession (unlike Bill), so — same as every other money figure in
   *  this app — notCharged is computed from each round's own price
   *  snapshots via orderLinesTotal, not a DB-side sum. One query. */
  static async getCancelledSummaryForRange({
    locationId,
    start,
    end,
  }: {
    locationId: number;
    start: Date;
    end: Date;
  }) {
    const sessions = await prisma.orderSession.findMany({
      where: OrderHistoryService.cancelledInRange({ locationId, start, end }),
      select: {
        cancelReason: true,
        cancellation: { select: { rejectReason: true } },
        orders: {
          where: { isArchived: false },
          select: {
            quantity: true,
            unitPrice: true,
            OrdersAddons: { select: { unitPrice: true } },
            voids: LINE_VOID_QUANTITIES,
          },
        },
      },
    });

    const missed = sessions.filter((session) =>
      (SHOP_MISSED_CANCEL_REASONS as readonly string[]).includes(
        session.cancelReason ?? "",
      ),
    );
    const withdrawn = sessions.filter(
      (session) => session.cancelReason === "WITHDRAWN",
    );
    const valueOf = (rounds: typeof sessions) =>
      rounds.reduce((sum, session) => sum + orderLinesTotal(session.orders), 0);
    return {
      count: missed.length,
      rejected: missed.filter((s) => s.cancelReason === "REJECTED").length,
      timedOut: missed.filter((s) => s.cancelReason === "EXPIRED").length,
      // Why the REJECTED ones were rejected (Reports) — from the same
      // rows, no extra query.
      reasons: summarizeRejectReasons(missed),
      notCharged: valueOf(missed),
      withdrawn: withdrawn.length,
      withdrawnValue: valueOf(withdrawn),
    };
  }

  /** Fully-loaded lines for a detail view — the one include shape
   *  shared by getPaidBillDetail/getCancelledRoundDetail below, with
   *  everything buildEntryBill needs to itemise each line (the menu's
   *  and each add-on's name, beside the price snapshots). */
  private static readonly detailOrdersInclude = {
    where: { isArchived: false },
    orderBy: { id: "asc" as const },
    include: {
      menu: { select: { name: true } },
      OrdersAddons: {
        include: {
          // With its group — "Sweet: Low" on the bill and reprint.
          addon: {
            select: { name: true, addonCategory: { select: { name: true } } },
          },
        },
      },
      // Voids with who / when / note — staff screens only.
      voids: STAFF_LINE_VOIDS,
    },
  };

  /** One paid bill's full breakdown — the detail page and (later) the
   *  reprint. `rounds` oldest first, priced and line-shaped by the SAME
   *  buildEntryBill the live Order List's bill uses (every round here
   *  is necessarily "accepted" — a bill is never created while a round
   *  still awaits approval — so `status` is passed as a constant just
   *  to satisfy that shared helper's shape, not read for any other
   *  reason). Every line's price is its own unitPrice/OrdersAddons.unitPrice
   *  snapshot, never Menu.price/Addon.price (Rule: a later price change
   *  must never repaint history). */
  static async getPaidBillDetail({
    locationId,
    billId,
  }: {
    locationId: number;
    billId: number;
  }) {
    const bill = await prisma.bill.findFirst({
      where: { id: billId, locationId },
      include: {
        sessions: {
          where: { isArchived: false },
          orderBy: { id: "asc" },
          include: {
            table: { select: { name: true } },
            orders: OrderHistoryService.detailOrdersInclude,
          },
        },
      },
    });
    if (!bill) throw new NotFoundError("Bill", billId);

    const firstRound = bill.sessions[0] ?? null;
    const { acceptedRounds } = buildEntryBill(
      bill.sessions.map((session) => ({
        orderNumber: session.orderNumber,
        createdAt: session.createdAt,
        status: "PAID",
        orders: session.orders,
      })),
    );

    return {
      id: bill.id,
      billNumber: bill.billNumber,
      total: bill.total,
      paidAt: bill.paidAt,
      title: firstRound ? OrderHistoryService.titleFor(firstRound) : "Counter",
      isCounter: firstRound?.isCounter ?? true,
      startedAt: firstRound?.createdAt ?? bill.createdAt,
      rounds: acceptedRounds,
    };
  }

  /** Same line-shaping as getPaidBillDetail (via buildEntryBill, one
   *  synthetic "round"), for a single cancelled round — there's no
   *  Bill row to group, a cancelled round was never paid. REJECTED/
   *  EXPIRED-only, same as listCancelledRounds — an UNSUBMITTED session
   *  has no real "order" to show a detail for. */
  static async getCancelledRoundDetail({
    locationId,
    sessionId,
  }: {
    locationId: number;
    sessionId: number;
  }) {
    const session = await prisma.orderSession.findFirst({
      where: {
        id: sessionId,
        locationId,
        status: "CANCELLED",
        cancelReason: { in: [...SENT_CANCEL_REASONS] },
      },
      include: {
        table: { select: { name: true } },
        cancellation: { select: cancellationSelect },
        orders: OrderHistoryService.detailOrdersInclude,
      },
    });
    if (!session) throw new NotFoundError("OrderSession", sessionId);

    const { acceptedRounds } = buildEntryBill([
      {
        orderNumber: session.orderNumber,
        createdAt: session.createdAt,
        status: "CANCELLED",
        orders: session.orders,
      },
    ]);

    return {
      id: session.id,
      orderNumber: session.orderNumber,
      title: OrderHistoryService.titleFor(session),
      isCounter: session.isCounter,
      // Guaranteed non-null by the cancelReason filter above.
      reason: session.cancelReason as string,
      cancellation: toCancellationDetail(session.cancellation),
      cancelledAt: session.updateTime,
      createdAt: session.createdAt,
      amount: orderLinesTotal(session.orders),
      lines: acceptedRounds[0]?.lines ?? [],
    };
  }

  /** The history calendar's minDate — the shop day of this location's
   *  very first OrderSession ever, or null when it has none yet (a
   *  brand-new location). */
  static async getFirstOrderDay(locationId: number): Promise<string | null> {
    const earliest = await prisma.orderSession.findFirst({
      where: { locationId, isArchived: false },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    return earliest ? toShopDay(earliest.createdAt) : null;
  }
}
