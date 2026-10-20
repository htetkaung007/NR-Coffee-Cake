import { prisma } from "../utils/prisma";
import { NotFoundError } from "../lib/errors";
import { MIN_PAIRING_UNITS, buildPairing } from "../lib/report/addonPairing";
import {
  aggregateItems,
  compareToPrevious,
  findSlowSellers,
  rankItems,
  reconciles,
  type ReportLine,
} from "../lib/report/itemReport";
import {
  elapsedDays,
  firstDays,
  isCurrentPeriod,
  periodFor,
  periodRangeUtc,
  previousPeriod,
  type ReportPeriod,
  type ReportPeriodKind,
} from "../lib/report/reportPeriod";
import {
  buildDailySeries,
  percentChange,
  splitByChannel,
  summarizeBills,
  type ReportBill,
} from "../lib/report/salesReport";
import { todayInShop } from "../lib/shopDay";
import { effectiveQuantity } from "../lib/order/voids";
import { summarizeVoids } from "../lib/report/voidReport";
import { SHOP_MISSED_CANCEL_REASONS } from "../lib/order/cancelReason";
import type {
  ExportBill,
  ExportCancelledRound,
  ExportLine,
} from "../lib/report/exportLines";
import { CartValidationService } from "./cartValidation.service";
import { OrderHistoryService } from "./orderHistory.service";

/** Which café the numbers are for. companyId is checked against the
 *  location, so a location id from elsewhere can never be read. */
interface Scope {
  companyId: number;
  locationId: number;
}

interface PeriodArgs extends Scope {
  kind: ReportPeriodKind;
  /** Any shop day ("YYYY-MM-DD") inside the period wanted. */
  anchorDay: string;
}

type Range = ReturnType<typeof periodRangeUtc>;

const unique = (ids: readonly number[]) => [...new Set(ids)];

/** What the CSV exports read of an order line — snapshots only, and
 *  never contributorToken or any other secret. */
const exportLineSelect = {
  id: true,
  menuId: true,
  quantity: true,
  unitPrice: true,
  note: true,
  OrdersAddons: {
    orderBy: { id: "asc" },
    select: { unitPrice: true, addon: { select: { name: true } } },
  },
  // Voided units are never sold (lib/order/voids).
  voids: { select: { quantity: true } },
} as const;

/** A menu's or add-on's names: English (always there) and the shop's
 *  Myanmar one (null when not given). */
type ShopName = { name: string; nameMy: string | null };

function toExportLine(
  order: {
    id: number;
    menuId: number;
    quantity: number;
    unitPrice: number;
    note: string | null;
    OrdersAddons: { unitPrice: number; addon: { name: string } }[];
    voids: { quantity: number }[];
  },
  menuNames: Map<number, ShopName>,
): ExportLine {
  return {
    id: order.id,
    menuId: order.menuId,
    // CSV exports stay English (the English name, always there).
    menuName: menuNames.get(order.menuId)?.name ?? "Unknown item",
    // What was sold — voided units left out (lib/order/voids).
    quantity: effectiveQuantity(order),
    unitPrice: order.unitPrice,
    addons: order.OrdersAddons.map((link) => ({
      name: link.addon.name,
      unitPrice: link.unitPrice,
    })),
    note: order.note,
  };
}

/**
 * Read-only data for the Backoffice Reports — money counts PAID bills only
 * (Bill.total, Bill.paidAt), days are shop days (Asia/Yangon). All the
 * arithmetic lives in the pure report libs (salesReport, itemReport,
 * addonPairing); this loads rows with a FIXED number of queries per method
 * (never one per row) and hands them over. BillService stays the write
 * side; nothing here ever writes. Prices always come from each line's own
 * snapshot (unitPrice), never Menu.price / Addon.price.
 */
export class ReportService {
  /**
   * Sales for a week or month: totals, one entry per day (zero days
   * included), the table/counter split, what was cancelled, and the same
   * totals for the period before.
   *
   * A period that is still running is compared with the same NUMBER of
   * days of the one before it (see firstDays), so a half-finished week is
   * never measured against a whole one. `previous.period` is the span
   * actually compared.
   *
   * Queries: 5 — the location check, then bills, the previous period's
   * bills and the cancelled rounds of both periods together.
   */
  static async getOverview({ companyId, locationId, kind, anchorDay }: PeriodArgs) {
    await ReportService.assertLocationInCompany({ companyId, locationId });

    const { period, today, compared, range, comparedRange } =
      ReportService.periodsFor(kind, anchorDay);

    const [bills, previousBills, cancelled, previousCancelled, voids] = await Promise.all([
      ReportService.loadBills(locationId, range),
      prisma.bill.findMany({
        where: {
          locationId,
          paidAt: { gte: comparedRange.start, lt: comparedRange.end },
        },
        select: { total: true },
      }),
      OrderHistoryService.getCancelledSummaryForRange({ locationId, ...range }),
      OrderHistoryService.getCancelledSummaryForRange({
        locationId,
        ...comparedRange,
      }),
      ReportService.loadVoids(locationId, range),
    ]);

    const summary = summarizeBills(bills);
    const previousSummary = summarizeBills(previousBills);
    return {
      period,
      isCurrentPeriod: isCurrentPeriod(period, today),
      current: {
        summary,
        daily: buildDailySeries(period, bills),
        channels: splitByChannel(bills),
        cancelled: {
          count: cancelled.count,
          rejected: cancelled.rejected,
          timedOut: cancelled.timedOut,
          // Rejected rounds per RejectReason, then "Not recorded".
          reasons: cancelled.reasons,
          notCharged: cancelled.notCharged,
          // Customers cancelling their own order while it waited — not the
          // shop's miss, so never in the figures above or their change.
          withdrawn: cancelled.withdrawn,
        },
        // Items voided off the period's paid bills (never charged): units,
        // value and why.
        voided: summarizeVoids(voids),
      },
      previous: {
        period: compared,
        summary: previousSummary,
        cancelled: { count: previousCancelled.count },
      },
      deltas: {
        sales: percentChange(summary.sales, previousSummary.sales),
        bills: percentChange(summary.bills, previousSummary.bills),
        avgBill: percentChange(summary.avgBill, previousSummary.avgBill),
        cancelled: percentChange(cancelled.count, previousCancelled.count),
      },
    };
  }

  /**
   * What sold: menus ranked by sales (the page can re-rank with
   * rankItems — rows carry name, quantity and itemSales — e.g. by units, or
   * within one category chip), each with its change on the previous period
   * (same fair comparison as getOverview); the slowest orderable menus,
   * menus with no sales included — ALL of them, slowest first, so the page
   * can filter and search the list (it shows as many as it wants); and
   * add-on sales. Menu sales and add-on
   * sales are kept apart — together they must equal the bills' total,
   * which `reconciled` says (the numbers are returned either way).
   *
   * "Orderable" is CartValidationService.loadOrderability's rule
   * (isMenuOrderable) — the same one the cart check uses. `categories`
   * are the categories visible here, in company order, for filter chips.
   *
   * Queries: 12 — location check; then lines, previous lines, the bills'
   * total and the 5 orderability queries together; then menu names,
   * menu→category links and add-on names together.
   */
  static async getItems({ companyId, locationId, kind, anchorDay }: PeriodArgs) {
    await ReportService.assertLocationInCompany({ companyId, locationId });

    const { period, range, comparedRange } = ReportService.periodsFor(
      kind,
      anchorDay,
    );

    const [lines, previousLines, billsTotal, orderable] = await Promise.all([
      ReportService.loadLines(locationId, range),
      ReportService.loadLines(locationId, comparedRange),
      prisma.bill.aggregate({
        where: { locationId, paidAt: { gte: range.start, lt: range.end } },
        _sum: { total: true },
      }),
      CartValidationService.getOrderableMenus(companyId, locationId),
    ]);

    const current = aggregateItems(lines);
    const previous = aggregateItems(previousLines);
    const slowSellers = findSlowSellers(
      orderable.menuIds,
      current.menus,
      orderable.menuIds.length,
    );

    const menuIds = unique([
      ...current.menus.map((row) => row.menuId),
      ...slowSellers.map((row) => row.menuId),
    ]);
    const [menuNames, categoryIdsByMenu, addonNames] = await Promise.all([
      ReportService.loadMenuNames(menuIds),
      ReportService.loadMenuCategoryIds(companyId, menuIds),
      ReportService.loadAddonNames(current.addons.map((row) => row.addonId)),
    ]);
    const menuName = (menuId: number) => menuNames.get(menuId)?.name ?? "Unknown item";
    // The shop's Myanmar name, for a Myanmar staff screen (null: none).
    const menuNameMy = (menuId: number) => menuNames.get(menuId)?.nameMy ?? null;
    const categoryIds = (menuId: number) => categoryIdsByMenu.get(menuId) ?? [];

    const changes = new Map(
      compareToPrevious(current.menus, previous.menus).map((change) => [
        change.menuId,
        change.deltaPercent,
      ]),
    );
    const items = rankItems(
      current.menus.map((row) => ({
        ...row,
        name: menuName(row.menuId),
        nameMy: menuNameMy(row.menuId),
        categoryIds: categoryIds(row.menuId),
        deltaPercent: changes.get(row.menuId) ?? null,
      })),
      { sortBy: "sales" },
    );

    const requiredGroupAddonIds = new Set(
      lines.flatMap((line) =>
        line.addons.filter((a) => a.isRequiredGroup).map((a) => a.addonId),
      ),
    );
    const addons = current.addons
      .map((row) => ({
        ...row,
        name: addonNames.get(row.addonId)?.name ?? "Unknown add-on",
        nameMy: addonNames.get(row.addonId)?.nameMy ?? null,
        isRequiredGroup: requiredGroupAddonIds.has(row.addonId),
      }))
      .sort(
        (a, b) =>
          b.timesChosen - a.timesChosen ||
          b.addonSales - a.addonSales ||
          a.name.localeCompare(b.name, "en") ||
          a.addonId - b.addonId,
      );

    const salesTotal = billsTotal._sum.total ?? 0;
    return {
      period,
      items,
      slowSellers: slowSellers.map((row) => ({
        ...row,
        name: menuName(row.menuId),
        nameMy: menuNameMy(row.menuId),
        categoryIds: categoryIds(row.menuId),
      })),
      addons,
      itemsTotal: current.itemsTotal,
      addonsTotal: current.addonsTotal,
      salesTotal,
      reconciled: reconciles(current.itemsTotal, current.addonsTotal, salesTotal),
      categories: orderable.visibleCategories.map((category) => ({
        id: category.id,
        name: category.name,
        nameMy: category.nameMy ?? null,
      })),
    };
  }

  /**
   * Everything the printable report shows, for one period: exactly
   * getOverview + getItems, run together — no queries or arithmetic of
   * its own, so the paper always matches the Reports page.
   */
  static async getPrintableReport(args: PeriodArgs) {
    const [overview, items] = await Promise.all([
      ReportService.getOverview(args),
      ReportService.getItems(args),
    ]);
    return { overview, items };
  }

  /**
   * The period's PAID bills for the order-lines CSV: each bill with its
   * rounds (oldest first) and their non-archived lines at their own price
   * snapshots, add-on names included. The bill's channel and table are its
   * FIRST round's, as loadBills decides them. Exactly the bills behind the
   * Reports page's Sales, so the lines add up to it.
   *
   * Queries: 3 — the location check, the bills (sessions, lines and
   * add-ons come with them), then the menu names.
   */
  static async getExportLines({ companyId, locationId, kind, anchorDay }: PeriodArgs) {
    await ReportService.assertLocationInCompany({ companyId, locationId });

    const period = periodFor(kind, anchorDay);
    const range = periodRangeUtc(period);
    const bills = await prisma.bill.findMany({
      where: { locationId, paidAt: { gte: range.start, lt: range.end } },
      orderBy: [{ paidAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        billNumber: true,
        paidAt: true,
        total: true,
        sessions: {
          where: { isArchived: false },
          orderBy: { id: "asc" },
          select: {
            orderNumber: true,
            createdAt: true,
            isCounter: true,
            table: { select: { name: true } },
            orders: { where: { isArchived: false }, select: exportLineSelect },
          },
        },
      },
    });

    const menuNames = await ReportService.loadMenuNames(
      unique(
        bills.flatMap((bill) =>
          bill.sessions.flatMap((session) => session.orders.map((order) => order.menuId)),
        ),
      ),
    );

    const rows: ExportBill[] = bills.map((bill) => {
      const first = bill.sessions[0];
      const isCounter = first?.isCounter ?? true;
      return {
        id: bill.id,
        billNumber: bill.billNumber,
        paidAt: bill.paidAt,
        total: bill.total,
        channel: isCounter ? "counter" : "table",
        tableName: isCounter ? null : (first?.table?.name ?? null),
        rounds: bill.sessions.map((session) => ({
          orderNumber: session.orderNumber,
          createdAt: session.createdAt,
          // A fully voided line was never sold — not in the sales CSV.
          lines: session.orders
            .filter((order) => effectiveQuantity(order) > 0)
            .map((order) => toExportLine(order, menuNames)),
        })),
      };
    });
    return { period, bills: rows };
  }

  /**
   * The period's REJECTED / EXPIRED rounds for the cancelled-lines CSV —
   * picked by OrderHistoryService.cancelledInRange, the same rule as the
   * Cancelled card, so its lines add up to "Not charged". Each with its
   * OrderCancellation row (null for rounds cancelled before those were
   * recorded) and its non-archived lines at their price snapshots.
   *
   * Queries: 3 — the location check, the rounds (cancellation, table,
   * lines and add-ons come with them), then the menu names.
   */
  static async getExportCancelled({
    companyId,
    locationId,
    kind,
    anchorDay,
  }: PeriodArgs) {
    await ReportService.assertLocationInCompany({ companyId, locationId });

    const period = periodFor(kind, anchorDay);
    const range = periodRangeUtc(period);
    const sessions = await prisma.orderSession.findMany({
      // The shop's misses only, so the lines add up to "Not charged".
      where: OrderHistoryService.cancelledInRange({
        locationId,
        ...range,
        reasons: SHOP_MISSED_CANCEL_REASONS,
      }),
      orderBy: [{ updateTime: "asc" }, { id: "asc" }],
      select: {
        orderNumber: true,
        isCounter: true,
        cancelReason: true,
        updateTime: true,
        table: { select: { name: true } },
        cancellation: {
          select: {
            requestedAt: true,
            decidedAt: true,
            rejectReason: true,
            note: true,
          },
        },
        orders: {
          where: { isArchived: false },
          select: { ...exportLineSelect, isArchived: true },
        },
      },
    });

    const menuNames = await ReportService.loadMenuNames(
      unique(sessions.flatMap((session) => session.orders.map((order) => order.menuId))),
    );

    const rounds: ExportCancelledRound[] = sessions.map((session) => ({
      orderNumber: session.orderNumber,
      channel: session.isCounter ? "counter" : "table",
      tableName: session.table?.name ?? null,
      // Only REJECTED / EXPIRED rounds were asked for.
      cancelReason: session.cancelReason as "REJECTED" | "EXPIRED",
      cancelledAt: session.updateTime,
      cancellation: session.cancellation,
      lines: session.orders.map((order) => ({
        ...toExportLine(order, menuNames),
        isArchived: order.isArchived,
      })),
    }));
    return { period, rounds };
  }

  /**
   * Which add-ons go with which menus, for the CALENDAR MONTH containing
   * anchorDay — independent of the Week/Month choice on the rest of the
   * page. Names are attached for the screen; `minUnits` is how many
   * units a menu needs before its pairs are shown ("6 / 10 sold so far").
   *
   * Queries: 4 — location check, the month's lines, then menu names and
   * add-on names together.
   */
  static async getPairing({
    companyId,
    locationId,
    anchorDay,
  }: Scope & { anchorDay: string }) {
    await ReportService.assertLocationInCompany({ companyId, locationId });

    const period = periodFor("month", anchorDay);
    const lines = await ReportService.loadLines(locationId, periodRangeUtc(period));
    const pairing = buildPairing(lines);

    const menuIds = Object.keys(pairing.byMenu).map(Number);
    const addonIds = Object.keys(pairing.byAddon).map(Number);
    const [menuNames, addonNames] = await Promise.all([
      ReportService.loadMenuNames(menuIds),
      ReportService.loadAddonNames(addonIds),
    ]);
    const menuName = (menuId: number) => menuNames.get(menuId)?.name ?? "Unknown item";
    const menuNameMy = (menuId: number) => menuNames.get(menuId)?.nameMy ?? null;
    const addonName = (addonId: number) =>
      addonNames.get(addonId)?.name ?? "Unknown add-on";
    const addonNameMy = (addonId: number) => addonNames.get(addonId)?.nameMy ?? null;

    return {
      period,
      isCurrentMonth: isCurrentPeriod(period, todayInShop()),
      minUnits: MIN_PAIRING_UNITS,
      menus: menuIds
        .map((menuId) => {
          const menu = pairing.byMenu[menuId];
          return {
            menuId,
            name: menuName(menuId),
            nameMy: menuNameMy(menuId),
            units: menu.units,
            status: menu.status,
            pairs: menu.pairs.map((pair) => ({
              ...pair,
              name: addonName(pair.addonId),
              nameMy: addonNameMy(pair.addonId),
            })),
          };
        })
        .sort(
          (a, b) =>
            b.units - a.units ||
            a.name.localeCompare(b.name, "en") ||
            a.menuId - b.menuId,
        ),
      addons: addonIds
        .map((addonId) => ({
          addonId,
          name: addonName(addonId),
          nameMy: addonNameMy(addonId),
          menus: pairing.byAddon[addonId].menus.map((entry) => ({
            ...entry,
            name: menuName(entry.menuId),
            nameMy: menuNameMy(entry.menuId),
          })),
        }))
        .sort(
          (a, b) =>
            a.name.localeCompare(b.name, "en") || a.addonId - b.addonId,
        ),
    };
  }

  /** The location must belong to the company — chain lookup, so it
   *  throws (Rule 6). Archived locations are fine: their past is still
   *  theirs to read. */
  private static async assertLocationInCompany({ companyId, locationId }: Scope) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, companyId },
      select: { id: true },
    });
    if (!location) throw new NotFoundError("Location", locationId);
  }

  /** The period wanted (the one holding `anchorDay`), the one it's
   *  compared with (comparisonPeriod, as of today in the shop) and both
   *  as UTC ranges — what getOverview and getItems start from. No
   *  queries. */
  private static periodsFor(kind: ReportPeriodKind, anchorDay: string) {
    const period = periodFor(kind, anchorDay);
    const today = todayInShop();
    const compared = ReportService.comparisonPeriod(period, today);
    return {
      period,
      today,
      compared,
      range: periodRangeUtc(period),
      comparedRange: periodRangeUtc(compared),
    };
  }

  /** The period the current one is measured against: the one before it —
   *  cut to the same number of days while the current one is still
   *  running. */
  private static comparisonPeriod(period: ReportPeriod, today: string) {
    const previous = previousPeriod(period);
    return isCurrentPeriod(period, today)
      ? firstDays(previous, elapsedDays(period, today))
      : previous;
  }

  /** Paid bills in the range, each with the channel it came from: the
   *  FIRST round's isCounter, as Order History decides it (a bill with no
   *  round counts as counter). */
  private static async loadBills(
    locationId: number,
    range: Range,
  ): Promise<ReportBill[]> {
    const bills = await prisma.bill.findMany({
      where: { locationId, paidAt: { gte: range.start, lt: range.end } },
      select: {
        total: true,
        paidAt: true,
        sessions: {
          where: { isArchived: false },
          orderBy: { id: "asc" },
          take: 1,
          select: { isCounter: true },
        },
      },
    });
    return bills.map((bill) => ({
      paidAt: bill.paidAt,
      total: bill.total,
      channel: (bill.sessions[0]?.isCounter ?? true) ? "counter" : "table",
    }));
  }

  /** One query: every non-archived order line of the sessions whose bill
   *  was paid in the range — only what the reports read, at the lines' own
   *  price snapshots. */
  private static async loadLines(
    locationId: number,
    range: Range,
  ): Promise<ReportLine[]> {
    const orders = await prisma.order.findMany({
      where: {
        isArchived: false,
        orderSession: {
          isArchived: false,
          bill: {
            locationId,
            paidAt: { gte: range.start, lt: range.end },
          },
        },
      },
      select: {
        menuId: true,
        quantity: true,
        unitPrice: true,
        OrdersAddons: {
          select: {
            addonId: true,
            unitPrice: true,
            addon: { select: { addonCategory: { select: { isRequired: true } } } },
          },
        },
        voids: { select: { quantity: true } },
      },
    });
    // What was sold: voided units left out, a fully voided line dropped —
    // so item and add-on sales still add up to the bills (Bill.total
    // leaves them out too).
    return orders
      .filter((order) => effectiveQuantity(order) > 0)
      .map((order) => ({
        menuId: order.menuId,
        quantity: effectiveQuantity(order),
        unitPrice: order.unitPrice,
        addons: order.OrdersAddons.map((link) => ({
          addonId: link.addonId,
          unitPrice: link.unitPrice,
          isRequiredGroup: link.addon.addonCategory.isRequired,
        })),
      }));
  }

  /** One query: every void on a line of the sessions whose bill was paid
   *  in the range — the same lines loadLines reads — with the line's own
   *  price snapshots, for the "Voided" figure (summarizeVoids). */
  private static async loadVoids(locationId: number, range: Range) {
    const voids = await prisma.orderVoid.findMany({
      where: {
        order: {
          isArchived: false,
          orderSession: {
            isArchived: false,
            bill: { locationId, paidAt: { gte: range.start, lt: range.end } },
          },
        },
      },
      select: {
        reason: true,
        quantity: true,
        order: {
          select: { unitPrice: true, OrdersAddons: { select: { unitPrice: true } } },
        },
      },
    });
    return voids.map((entry) => ({
      reason: entry.reason,
      quantity: entry.quantity,
      unitPrice: entry.order.unitPrice,
      addonUnitPrices: entry.order.OrdersAddons.map((link) => link.unitPrice),
    }));
  }

  /** menu id → its names (English, and the shop's Myanmar one). */
  private static async loadMenuNames(menuIds: readonly number[]) {
    if (menuIds.length === 0) return new Map<number, ShopName>();
    const menus = await prisma.menu.findMany({
      where: { id: { in: [...menuIds] } },
      select: { id: true, name: true, nameMy: true },
    });
    return new Map(
      menus.map((menu) => [menu.id, { name: menu.name, nameMy: menu.nameMy }]),
    );
  }

  /** add-on id → its names (English, and the shop's Myanmar one). */
  private static async loadAddonNames(addonIds: readonly number[]) {
    if (addonIds.length === 0) return new Map<number, ShopName>();
    const addons = await prisma.addon.findMany({
      where: { id: { in: [...addonIds] } },
      select: { id: true, name: true, nameMy: true },
    });
    return new Map(
      addons.map((addon) => [addon.id, { name: addon.name, nameMy: addon.nameMy }]),
    );
  }

  /** menu id → ids of the company's live categories it is linked to. */
  private static async loadMenuCategoryIds(
    companyId: number,
    menuIds: readonly number[],
  ) {
    const byMenu = new Map<number, number[]>();
    if (menuIds.length === 0) return byMenu;
    const links = await prisma.menuMenuCategory.findMany({
      where: {
        menuId: { in: [...menuIds] },
        isArchived: false,
        menuCategory: { companyId, isArchived: false },
      },
      select: { menuId: true, menuCategoryId: true },
    });
    for (const link of links) {
      byMenu.set(link.menuId, [...(byMenu.get(link.menuId) ?? []), link.menuCategoryId]);
    }
    return byMenu;
  }
}
