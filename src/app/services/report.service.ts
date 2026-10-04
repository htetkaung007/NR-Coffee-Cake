import { prisma } from "../utils/prisma";
import { NotFoundError } from "../lib/errors";
import { MIN_PAIRING_UNITS, buildPairing } from "../lib/addonPairing";
import {
  aggregateItems,
  compareToPrevious,
  findSlowSellers,
  rankItems,
  reconciles,
  type ReportLine,
} from "../lib/itemReport";
import {
  elapsedDays,
  firstDays,
  isCurrentPeriod,
  periodFor,
  periodRangeUtc,
  previousPeriod,
  type ReportPeriod,
  type ReportPeriodKind,
} from "../lib/reportPeriod";
import {
  buildDailySeries,
  percentChange,
  splitByChannel,
  summarizeBills,
  type ReportBill,
} from "../lib/salesReport";
import { todayInShop } from "../lib/shopDay";
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

    const period = periodFor(kind, anchorDay);
    const today = todayInShop();
    const compared = ReportService.comparisonPeriod(period, today);
    const range = periodRangeUtc(period);
    const comparedRange = periodRangeUtc(compared);

    const [bills, previousBills, cancelled, previousCancelled] = await Promise.all([
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
          notCharged: cancelled.notCharged,
        },
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

    const period = periodFor(kind, anchorDay);
    const today = todayInShop();
    const compared = ReportService.comparisonPeriod(period, today);
    const range = periodRangeUtc(period);
    const comparedRange = periodRangeUtc(compared);

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
    const menuName = (menuId: number) => menuNames.get(menuId) ?? "Unknown item";
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
        name: addonNames.get(row.addonId) ?? "Unknown add-on",
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
      })),
    };
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
    const menuName = (menuId: number) => menuNames.get(menuId) ?? "Unknown item";
    const addonName = (addonId: number) =>
      addonNames.get(addonId) ?? "Unknown add-on";

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
            units: menu.units,
            status: menu.status,
            pairs: menu.pairs.map((pair) => ({
              ...pair,
              name: addonName(pair.addonId),
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
          menus: pairing.byAddon[addonId].menus.map((entry) => ({
            ...entry,
            name: menuName(entry.menuId),
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
      },
    });
    return orders.map((order) => ({
      menuId: order.menuId,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      addons: order.OrdersAddons.map((link) => ({
        addonId: link.addonId,
        unitPrice: link.unitPrice,
        isRequiredGroup: link.addon.addonCategory.isRequired,
      })),
    }));
  }

  private static async loadMenuNames(menuIds: readonly number[]) {
    if (menuIds.length === 0) return new Map<number, string>();
    const menus = await prisma.menu.findMany({
      where: { id: { in: [...menuIds] } },
      select: { id: true, name: true },
    });
    return new Map(menus.map((menu) => [menu.id, menu.name]));
  }

  private static async loadAddonNames(addonIds: readonly number[]) {
    if (addonIds.length === 0) return new Map<number, string>();
    const addons = await prisma.addon.findMany({
      where: { id: { in: [...addonIds] } },
      select: { id: true, name: true },
    });
    return new Map(addons.map((addon) => [addon.id, addon.name]));
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
