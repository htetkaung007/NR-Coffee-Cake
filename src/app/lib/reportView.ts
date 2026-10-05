import { TOP_PAIRS } from "./addonPairing";
import { countLabel, formatAmount } from "./orderFormat";
import {
  elapsedDays,
  isCurrentPeriod,
  MONTH_NAMES,
  nextPeriod,
  periodLabel,
  previousPeriod,
  type ReportPeriod,
  type ReportPeriodKind,
} from "./reportPeriod";
import { isShopDay } from "./shopDay";

/** The Backoffice Reports page's view state, kept in the URL
 *  (?period=week|month&day=YYYY-MM-DD&tab=overview|items&list=top|slow). */
const REPORTS_PATH = "/backoffice/reports";

export type ReportTab = "overview" | "items";
export type ReportList = "top" | "slow";
export type ReportSortBy = "sales" | "quantity";

export interface ReportParams {
  kind: ReportPeriodKind;
  /** Any shop day inside the period shown. */
  day: string;
  tab: ReportTab;
  list: ReportList;
}

/** Whatever the URL gave, made safe: unknown or missing values fall back
 *  to the defaults (week, today, overview, top); a day that isn't a real
 *  date, or is after today, becomes today — a hand-edited link never
 *  errors. */
export function parseReportParams(
  raw: { period?: string; day?: string; tab?: string; list?: string },
  today: string,
): ReportParams {
  const kind = raw.period === "month" ? "month" : "week";
  const tab = raw.tab === "items" ? "items" : "overview";
  const list = raw.list === "slow" ? "slow" : "top";
  const isUsableDay = raw.day !== undefined && isShopDay(raw.day) && raw.day <= today;
  return { kind, day: isUsableDay ? raw.day! : today, tab, list };
}

/** The URL for a view state — period, day and tab always, `list` only
 *  when it isn't the default. */
export function reportHref(params: ReportParams): string {
  const { kind, day, tab, list } = params;
  const base = `${REPORTS_PATH}?period=${kind}&day=${day}&tab=${tab}`;
  return list === "slow" ? `${base}&list=slow` : base;
}

/** What every report's figures are — under the Reports page and on the
 *  printable report alike. */
export const REPORT_FOOTNOTE =
  "Café sales · paid bills only · internet voucher sales not included";

/** The printable report (print / Save as PDF) for the period around
 *  `day` — outside the Backoffice, under the (print) route group. */
export function printableReportHref(params: {
  kind: ReportPeriodKind;
  day: string;
}): string {
  return `/print/report?period=${params.kind}&day=${params.day}`;
}

/** The CSV download for the period around `day`: its order lines, or
 *  its cancelled rounds' lines (see reports/export/route.ts). */
export function reportExportHref(params: {
  type: "lines" | "cancelled";
  kind: ReportPeriodKind;
  day: string;
}): string {
  return `${REPORTS_PATH}/export?type=${params.type}&period=${params.kind}&day=${params.day}`;
}

/** "Monthly report — October 2026" / "Weekly report — Sep 28 – Oct 4,
 *  2026" — the printable report's title. */
export function printableReportTitle(period: ReportPeriod): string {
  const kind = period.kind === "month" ? "Monthly" : "Weekly";
  return `${kind} report — ${periodLabel(period)}`;
}

/** The days the period navigator's arrows lead to: any day of the period
 *  before, and of the one after — null when there is none yet (the
 *  current period has no "next"). */
export function navigationDays(
  period: ReportPeriod,
  today: string,
): { prevDay: string; nextDay: string | null } {
  const next = nextPeriod(period);
  const hasNext = !isCurrentPeriod(period, today) && next.startDay <= today;
  return {
    prevDay: previousPeriod(period).startDay,
    nextDay: hasNext ? next.startDay : null,
  };
}

export type DeltaDirection = "up" | "down" | "flat" | "none";

export interface DeltaText {
  direction: DeltaDirection;
  /** "▲" / "▼" / "▬" / "—" — shown next to the amount, so a change never
   *  depends on colour alone. */
  arrow: string;
  /** "12%" (no sign — the arrow carries it); "" when there's nothing to
   *  compare with. */
  amount: string;
  /** "▲ 12% vs last week", or "—". */
  label: string;
  /** The same for a screen reader: "Up 12% vs last week". */
  spoken: string;
}

/** A change on the previous period, as text. null — no previous data —
 *  is "—". */
export function formatDelta(
  percent: number | null,
  kind: ReportPeriodKind,
): DeltaText {
  if (percent === null) {
    return {
      direction: "none",
      arrow: "—",
      amount: "",
      label: "—",
      spoken: "No comparison available",
    };
  }
  const comparison = kind === "week" ? "vs last week" : "vs last month";
  const amount = `${Number(Math.abs(percent).toFixed(1))}%`;
  if (percent > 0) {
    return {
      direction: "up",
      arrow: "▲",
      amount,
      label: `▲ ${amount} ${comparison}`,
      spoken: `Up ${amount} ${comparison}`,
    };
  }
  if (percent < 0) {
    return {
      direction: "down",
      arrow: "▼",
      amount,
      label: `▼ ${amount} ${comparison}`,
      spoken: `Down ${amount} ${comparison}`,
    };
  }
  return {
    direction: "flat",
    arrow: "▬",
    amount: "0%",
    label: `▬ 0% ${comparison}`,
    spoken: `No change ${comparison}`,
  };
}

/** The smallest "round" number (1, 1.5, 2, 2.5, 3, 4, 5, 6, 8 × a power of
 *  ten) at or above `value` — the top of a chart's scale. 0 for 0. */
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

export function niceMax(value: number): number {
  if (value <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  // The epsilon keeps 100,000 from being nudged up by float noise.
  const step = NICE_STEPS.find((candidate) => candidate >= scaled - 1e-9) ?? 10;
  return step * magnitude;
}

/** Gridline values for a scale topping out at `max`: bottom, middle, top
 *  ([0] when there's nothing to scale). */
export function chartTicks(max: number): number[] {
  return max <= 0 ? [0] : [0, max / 2, max];
}

/** How tall a bar is, 0–1, against the top of the scale. */
export function barRatio(value: number, max: number): number {
  return max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
}

/** Which days of the period get a label under the chart: every day of a
 *  week, every 5th (the 1st, 6th, 11th …) of a month — so 31 bars stay
 *  readable on a phone. */
export function axisLabelIndexes(
  count: number,
  kind: ReportPeriodKind,
): number[] {
  const everyDay = Array.from({ length: count }, (_, index) => index);
  return kind === "week" ? everyDay : everyDay.filter((index) => index % 5 === 0);
}

/** "Mon 28 Sep" — English names whatever the device's language. */
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatReportDay(day: string): string {
  const [, month, dayOfMonth] = day.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
  return `${weekday} ${dayOfMonth} ${MONTH_NAMES[month - 1].slice(0, 3)}`;
}

/** What a bar says to a screen reader and in its tooltip:
 *  "Mon 28 Sep: 142,000 MMK, 12 bills" (", today" for today's). */
export function barLabel(
  entry: { day: string; sales: number; bills: number },
  isToday: boolean,
): string {
  const bills = countLabel(entry.bills, "bill", "bills");
  const text = `${formatReportDay(entry.day)}: ${formatAmount(entry.sales)}, ${bills}`;
  return isToday ? `${text}, today` : text;
}

/** "Week in progress · 4 of 7 days" for the current period, null for a
 *  finished one. */
export function progressCaption(
  period: ReportPeriod,
  today: string,
): string | null {
  if (!isCurrentPeriod(period, today)) return null;
  const name = period.kind === "week" ? "Week" : "Month";
  return `${name} in progress · ${elapsedDays(period, today)} of ${period.days.length} days`;
}

export interface ReportItem {
  menuId: number;
  name: string;
  categoryIds: number[];
  quantity: number;
  itemSales: number;
  /** Percent of ALL item sales, one decimal. */
  share: number;
  deltaPercent: number | null;
}

export interface ReportSlowItem {
  menuId: number;
  name: string;
  categoryIds: number[];
  quantity: number;
}

export interface ItemListRow extends ReportItem {
  /** 1-based position in the list as shown. */
  rank: number;
}

/**
 * The Items tab's list. "top": the menus that sold, best first by the
 * chosen measure. "slow": the orderable menus, slowest first — menus
 * with no sales included, as zeros. Category and search only FILTER (a
 * menu's `share` is always its share of all item sales, never of the
 * filtered rows), then ranks are numbered from 1 in the order shown.
 * Equal values order by name, then id. Doesn't change what it's given.
 */
export function buildItemList(input: {
  items: readonly ReportItem[];
  slowSellers: readonly ReportSlowItem[];
  list: ReportList;
  sortBy: ReportSortBy;
  categoryId: number | null;
  search: string;
}): ItemListRow[] {
  const { items, slowSellers, list, sortBy, categoryId, search } = input;
  const term = search.trim().toLowerCase();
  const sold = new Map(items.map((row) => [row.menuId, row]));

  // Slow sellers are whatever is orderable; one that did sell keeps its
  // figures, one that didn't is all zeros.
  const source: ReportItem[] =
    list === "top"
      ? [...items]
      : slowSellers.map(
          (slowRow) =>
            sold.get(slowRow.menuId) ?? {
              ...slowRow,
              itemSales: 0,
              share: 0,
              deltaPercent: null,
            },
        );

  const measure = (row: ReportItem) =>
    sortBy === "sales" ? row.itemSales : row.quantity;
  const direction = list === "top" ? -1 : 1;

  return source
    .filter((row) => categoryId === null || row.categoryIds.includes(categoryId))
    .filter((row) => term === "" || row.name.toLowerCase().includes(term))
    .sort(
      (a, b) =>
        direction * (measure(a) - measure(b)) ||
        a.name.localeCompare(b.name, "en") ||
        a.menuId - b.menuId,
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

// ── Add-on pairing (the Items tab's expandable panels) ──────────────────

export interface PairingMenu {
  menuId: number;
  name: string;
  /** Units of the menu sold in the pairing month. */
  units: number;
  status: "ok" | "notEnough";
  pairs: { addonId: number; name: string; units: number; rate: number }[];
}

export interface PairingAddon {
  addonId: number;
  name: string;
  menus: { menuId: number; name: string; units: number; rate: number }[];
}

/** One line of a pairing panel: "Extra shot · 62% · n = 94 units". */
export interface PairingRow {
  /** The add-on's id in a menu's panel, the menu's id in an add-on's. */
  id: number;
  name: string;
  /** Whole percent of the MENU's units that had the add-on. */
  rate: number;
  /** How many units of the menu this rate is out of (the "n"). */
  menuUnits: number;
  /** How many of those units had the add-on. */
  pairUnits: number;
}

/** What a menu's panel shows. A menu with no sales that month is not in
 *  the pairing data — it reads as "0 sold so far", not enough. */
export function menuPairingView(
  menus: readonly PairingMenu[],
  menuId: number,
): { status: "ok" | "notEnough"; units: number; rows: PairingRow[] } {
  const menu = menus.find((candidate) => candidate.menuId === menuId);
  if (!menu) return { status: "notEnough", units: 0, rows: [] };
  return {
    status: menu.status,
    units: menu.units,
    rows: menu.pairs.map((pair) => ({
      id: pair.addonId,
      name: pair.name,
      rate: pair.rate,
      menuUnits: menu.units,
      pairUnits: pair.units,
    })),
  };
}

/** What an add-on's panel shows: the (at most 3) menus it goes with, each
 *  with the share of THAT menu's units that had it. Empty when no menu
 *  has sold enough yet — or for an add-on pairing leaves out. */
export function addonPairingView(
  addons: readonly PairingAddon[],
  menus: readonly PairingMenu[],
  addonId: number,
): PairingRow[] {
  const addon = addons.find((candidate) => candidate.addonId === addonId);
  if (!addon) return [];
  const unitsOf = new Map(menus.map((menu) => [menu.menuId, menu.units]));
  return addon.menus.slice(0, TOP_PAIRS).map((entry) => ({
    id: entry.menuId,
    name: entry.name,
    rate: entry.rate,
    menuUnits: unitsOf.get(entry.menuId) ?? entry.units,
    pairUnits: entry.units,
  }));
}

/** "September in progress" for the current month, null for a finished
 *  one — the pairing section's own caption (the page's period caption
 *  counts days; this names the month). */
export function pairingMonthCaption(
  period: ReportPeriod,
  today: string,
): string | null {
  if (!isCurrentPeriod(period, today)) return null;
  const month = Number(period.startDay.slice(5, 7));
  return `${MONTH_NAMES[month - 1]} in progress`;
}
