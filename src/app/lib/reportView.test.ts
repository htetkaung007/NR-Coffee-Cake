import { describe, it, expect } from "vitest";
import {
  axisLabelIndexes,
  barLabel,
  barRatio,
  buildItemList,
  chartTicks,
  formatDelta,
  formatReportDay,
  addonPairingView,
  menuPairingView,
  navigationDays,
  pairingMonthCaption,
  type PairingAddon,
  type PairingMenu,
  niceMax,
  parseReportParams,
  progressCaption,
  reportHref,
  type ReportItem,
  type ReportSlowItem,
} from "./reportView";
import { periodFor } from "./reportPeriod";
import {
  printableReportHref,
  printableReportTitle,
  reportExportHref,
} from "./reportView";

const TODAY = "2026-09-30"; // a Wednesday; its week is Sep 28 – Oct 4

describe("parseReportParams", () => {
  it("defaults to this week, today, the overview and the top list", () => {
    expect(parseReportParams({}, TODAY)).toEqual({
      kind: "week",
      day: TODAY,
      tab: "overview",
      list: "top",
    });
  });

  it("reads a month, a day, the items tab and the slow list", () => {
    expect(
      parseReportParams(
        { period: "month", day: "2026-09-10", tab: "items", list: "slow" },
        TODAY,
      ),
    ).toEqual({ kind: "month", day: "2026-09-10", tab: "items", list: "slow" });
  });

  it("falls back to a week for an unknown period", () => {
    expect(parseReportParams({ period: "year" }, TODAY).kind).toBe("week");
  });

  it("falls back to the overview for an unknown tab", () => {
    expect(parseReportParams({ tab: "pairing" }, TODAY).tab).toBe("overview");
  });

  it("falls back to the top list for an unknown list", () => {
    expect(parseReportParams({ list: "middle" }, TODAY).list).toBe("top");
  });

  it("uses today for a day that isn't in YYYY-MM-DD form", () => {
    expect(parseReportParams({ day: "yesterday" }, TODAY).day).toBe(TODAY);
  });

  it("uses today for a day that doesn't exist", () => {
    expect(parseReportParams({ day: "2026-02-30" }, TODAY).day).toBe(TODAY);
  });

  it("uses today for a day after today", () => {
    expect(parseReportParams({ day: "2026-10-01" }, TODAY).day).toBe(TODAY);
  });

  it("keeps today itself and any earlier day", () => {
    expect(parseReportParams({ day: TODAY }, TODAY).day).toBe(TODAY);
    expect(parseReportParams({ day: "2020-01-01" }, TODAY).day).toBe("2020-01-01");
  });
});

describe("reportHref", () => {
  it("writes period, day and tab", () => {
    expect(
      reportHref({ kind: "month", day: "2026-09-10", tab: "overview", list: "top" }),
    ).toBe("/backoffice/reports?period=month&day=2026-09-10&tab=overview");
  });

  it("adds the list only when it isn't the default", () => {
    expect(
      reportHref({ kind: "week", day: TODAY, tab: "items", list: "slow" }),
    ).toBe("/backoffice/reports?period=week&day=2026-09-30&tab=items&list=slow");
  });

  it("round-trips through parseReportParams", () => {
    const params = { kind: "month", day: "2026-08-15", tab: "items", list: "slow" } as const;
    const query = reportHref(params).split("?")[1];
    const raw = Object.fromEntries(new URLSearchParams(query));
    expect(parseReportParams(raw, TODAY)).toEqual(params);
  });
});

describe("navigationDays", () => {
  it("leads to the day before the period started", () => {
    const { prevDay } = navigationDays(periodFor("week", TODAY), TODAY);
    expect(prevDay).toBe("2026-09-21");
  });

  it("has no next day while the period is the current one", () => {
    expect(navigationDays(periodFor("week", TODAY), TODAY).nextDay).toBeNull();
    expect(navigationDays(periodFor("month", TODAY), TODAY).nextDay).toBeNull();
  });

  it("leads to the first day of the next period for a finished one", () => {
    const week = periodFor("week", "2026-09-23");
    expect(navigationDays(week, TODAY).nextDay).toBe("2026-09-28");
    const month = periodFor("month", "2026-08-10");
    expect(navigationDays(month, TODAY).nextDay).toBe("2026-09-01");
  });
});

describe("formatDelta", () => {
  it("shows an increase with an up arrow", () => {
    const delta = formatDelta(12, "week");
    expect(delta.direction).toBe("up");
    expect(delta.label).toBe("▲ 12% vs last week");
  });

  it("shows a decrease with a down arrow and no minus sign", () => {
    const delta = formatDelta(-8.5, "month");
    expect(delta.direction).toBe("down");
    expect(delta.label).toBe("▼ 8.5% vs last month");
  });

  it("shows no change as flat", () => {
    const delta = formatDelta(0, "week");
    expect(delta.direction).toBe("flat");
    expect(delta.label).toBe("▬ 0% vs last week");
  });

  it("is a dash when there is nothing to compare with", () => {
    const delta = formatDelta(null, "week");
    expect(delta.direction).toBe("none");
    expect(delta.label).toBe("—");
    expect(delta.amount).toBe("");
  });

  it("gives the arrow and the amount separately for a table row", () => {
    const delta = formatDelta(326.8, "week");
    expect(delta.arrow).toBe("▲");
    expect(delta.amount).toBe("326.8%");
  });

  it("drops a trailing .0", () => {
    expect(formatDelta(50, "week").amount).toBe("50%");
  });

  it("says it in words for a screen reader", () => {
    expect(formatDelta(12, "week").spoken).toBe("Up 12% vs last week");
    expect(formatDelta(-3, "month").spoken).toBe("Down 3% vs last month");
    expect(formatDelta(0, "week").spoken).toBe("No change vs last week");
    expect(formatDelta(null, "week").spoken).toBe("No comparison available");
  });
});

describe("niceMax", () => {
  it.each([
    [0, 0],
    [142000, 150000],
    [93900, 100000],
    [100000, 100000],
    [100001, 150000],
    [9500, 10000],
    [1050, 1500],
    [300000, 300000],
    [2100000, 2500000],
  ])("rounds %s up to %s", (value, expected) => {
    expect(niceMax(value)).toBe(expected);
  });
});

describe("chartTicks", () => {
  it("gives the bottom, the middle and the top", () => {
    expect(chartTicks(150000)).toEqual([0, 75000, 150000]);
  });

  it("is just 0 when there is nothing to scale", () => {
    expect(chartTicks(0)).toEqual([0]);
  });
});

describe("barRatio", () => {
  it("is the value's share of the scale", () => {
    expect(barRatio(75000, 150000)).toBe(0.5);
  });

  it("is 1 at the top of the scale", () => {
    expect(barRatio(150000, 150000)).toBe(1);
  });

  it("is 0 for a day with no sales", () => {
    expect(barRatio(0, 150000)).toBe(0);
  });

  it("is 0 when the scale is empty", () => {
    expect(barRatio(0, 0)).toBe(0);
  });

  it("never goes above 1", () => {
    expect(barRatio(200000, 150000)).toBe(1);
  });
});

describe("axisLabelIndexes", () => {
  it("labels every day of a week", () => {
    expect(axisLabelIndexes(7, "week")).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("labels every 5th day of a 31-day month", () => {
    expect(axisLabelIndexes(31, "month")).toEqual([0, 5, 10, 15, 20, 25, 30]);
  });

  it("labels every 5th day of a 28-day month", () => {
    expect(axisLabelIndexes(28, "month")).toEqual([0, 5, 10, 15, 20, 25]);
  });
});

describe("formatReportDay", () => {
  it("writes weekday, day and month", () => {
    expect(formatReportDay("2026-09-28")).toBe("Mon 28 Sep");
    expect(formatReportDay("2026-10-04")).toBe("Sun 4 Oct");
  });
});

describe("barLabel", () => {
  it("says the day, the sales and the bills", () => {
    expect(barLabel({ day: "2026-09-28", sales: 142000, bills: 12 }, false)).toBe(
      "Mon 28 Sep: 142,000 MMK, 12 bills",
    );
  });

  it("says '1 bill' for a single bill", () => {
    expect(barLabel({ day: "2026-09-29", sales: 2000, bills: 1 }, false)).toBe(
      "Tue 29 Sep: 2,000 MMK, 1 bill",
    );
  });

  it("says a day with no sales plainly", () => {
    expect(barLabel({ day: "2026-09-29", sales: 0, bills: 0 }, false)).toBe(
      "Tue 29 Sep: 0 MMK, 0 bills",
    );
  });

  it("marks today", () => {
    expect(barLabel({ day: "2026-09-30", sales: 5000, bills: 2 }, true)).toBe(
      "Wed 30 Sep: 5,000 MMK, 2 bills, today",
    );
  });
});

describe("progressCaption", () => {
  it("counts the days so far of the current week", () => {
    expect(progressCaption(periodFor("week", TODAY), TODAY)).toBe(
      "Week in progress · 3 of 7 days",
    );
  });

  it("counts the days so far of the current month", () => {
    expect(progressCaption(periodFor("month", TODAY), TODAY)).toBe(
      "Month in progress · 30 of 30 days",
    );
  });

  it("is null for a finished period", () => {
    expect(progressCaption(periodFor("week", "2026-09-23"), TODAY)).toBeNull();
    expect(progressCaption(periodFor("month", "2026-08-10"), TODAY)).toBeNull();
  });
});

// ── The Items list ──────────────────────────────────────────────────────

const COFFEE = 1;
const DESSERT = 2;

function item(
  menuId: number,
  name: string,
  quantity: number,
  itemSales: number,
  overrides: Partial<ReportItem> = {},
): ReportItem {
  return {
    menuId,
    name,
    categoryIds: [COFFEE],
    quantity,
    itemSales,
    share: 10,
    deltaPercent: null,
    ...overrides,
  };
}

function slow(
  menuId: number,
  name: string,
  quantity: number,
  categoryIds = [COFFEE],
): ReportSlowItem {
  return { menuId, name, categoryIds, quantity };
}

// Latte: few units, high sales. Tea: many units, low sales.
const latte = item(1, "Latte", 2, 10000, { share: 45.5 });
const tea = item(2, "Tea", 9, 4500, { share: 20.5 });
const mocha = item(3, "Mocha", 5, 7500, { share: 34.1 });
const cake = item(4, "Cheesecake", 3, 6000, { categoryIds: [DESSERT], share: 27.3 });
const sold = [latte, tea, mocha, cake];

const base = {
  items: sold,
  slowSellers: [] as ReportSlowItem[],
  list: "top" as const,
  sortBy: "sales" as const,
  categoryId: null,
  search: "",
};

const ids = (rows: { menuId: number }[]) => rows.map((row) => row.menuId);

describe("buildItemList — top sellers", () => {
  it("puts the highest sales first when sorting by sales", () => {
    expect(ids(buildItemList(base))).toEqual([1, 3, 4, 2]);
  });

  it("puts the most units first when sorting by quantity", () => {
    expect(ids(buildItemList({ ...base, sortBy: "quantity" }))).toEqual([2, 3, 4, 1]);
  });

  it("orders equal values by name, then by id", () => {
    const rows = [
      item(7, "Special", 1, 3000),
      item(5, "Special", 1, 3000),
      item(6, "Almond", 1, 3000),
    ];
    expect(ids(buildItemList({ ...base, items: rows }))).toEqual([6, 5, 7]);
  });

  it("numbers the ranks from 1 in the order shown", () => {
    expect(buildItemList(base).map((row) => row.rank)).toEqual([1, 2, 3, 4]);
  });

  it("keeps each menu's own figures", () => {
    const [first] = buildItemList(base);
    expect(first).toMatchObject({ menuId: 1, quantity: 2, itemSales: 10000, share: 45.5 });
  });
});

describe("buildItemList — filters", () => {
  it("shows only the menus in the chosen category", () => {
    expect(ids(buildItemList({ ...base, categoryId: DESSERT }))).toEqual([4]);
  });

  it("keeps a menu's share of ALL sales when filtering, not of the category", () => {
    const [only] = buildItemList({ ...base, categoryId: DESSERT });
    expect(only.share).toBe(27.3);
  });

  it("starts the ranks again at 1 after filtering", () => {
    const rows = buildItemList({ ...base, categoryId: COFFEE });
    expect(rows.map((row) => row.rank)).toEqual([1, 2, 3]);
  });

  it("is empty for a category no menu is in", () => {
    expect(buildItemList({ ...base, categoryId: 99 })).toEqual([]);
  });

  it("finds a menu by part of its name, ignoring case", () => {
    expect(ids(buildItemList({ ...base, search: "LAT" }))).toEqual([1]);
  });

  it("ignores spaces around the search", () => {
    expect(ids(buildItemList({ ...base, search: "  tea " }))).toEqual([2]);
  });

  it("shows everything for a blank search", () => {
    expect(buildItemList({ ...base, search: "   " })).toHaveLength(4);
  });

  it("applies the category and the search together", () => {
    // "e" is in Latte and Tea (Coffee), and Cheesecake (Dessert) — not Mocha.
    expect(ids(buildItemList({ ...base, categoryId: COFFEE, search: "e" }))).toEqual([
      1, 2,
    ]);
    expect(buildItemList({ ...base, categoryId: DESSERT, search: "latte" })).toEqual([]);
  });
});

describe("buildItemList — slow sellers", () => {
  const slowSellers = [
    slow(9, "Never Sold", 0, [DESSERT]),
    slow(1, "Latte", 2),
    slow(3, "Mocha", 5),
    slow(2, "Tea", 9),
  ];
  const slowBase = { ...base, items: sold, slowSellers, list: "slow" as const };

  it("puts the fewest units first when sorting by quantity", () => {
    expect(ids(buildItemList({ ...slowBase, sortBy: "quantity" }))).toEqual([
      9, 1, 3, 2,
    ]);
  });

  it("includes a menu with no sales, as zeros with no change", () => {
    const [never] = buildItemList(slowBase);
    expect(never).toMatchObject({
      menuId: 9,
      quantity: 0,
      itemSales: 0,
      share: 0,
      deltaPercent: null,
      rank: 1,
    });
  });

  it("takes sales, share and change from the menu's sales when it did sell", () => {
    const rows = buildItemList({
      ...slowBase,
      items: [item(1, "Latte", 2, 10000, { share: 45.5, deltaPercent: 27.3 })],
    });
    const latteRow = rows.find((row) => row.menuId === 1);
    expect(latteRow).toMatchObject({ itemSales: 10000, share: 45.5, deltaPercent: 27.3 });
  });

  it("puts the lowest sales first when sorting by sales", () => {
    // Tea 4,500 < Mocha 7,500 < Latte 10,000; Never Sold has none.
    expect(ids(buildItemList({ ...slowBase, sortBy: "sales" }))).toEqual([9, 2, 3, 1]);
  });

  it("applies the category and the search", () => {
    expect(ids(buildItemList({ ...slowBase, categoryId: DESSERT }))).toEqual([9]);
    expect(ids(buildItemList({ ...slowBase, search: "tea" }))).toEqual([2]);
  });

  it("numbers the ranks from 1", () => {
    expect(buildItemList(slowBase).map((row) => row.rank)).toEqual([1, 2, 3, 4]);
  });
});

describe("buildItemList — purity", () => {
  it("doesn't change the lists it was given", () => {
    const items = [...sold];
    const slowSellers = [slow(9, "Never Sold", 0)];
    buildItemList({ ...base, items, slowSellers, sortBy: "quantity" });
    expect(items.map((row) => row.menuId)).toEqual([1, 2, 3, 4]);
    expect(items[0]).not.toHaveProperty("rank");
  });
});

// ── Add-on pairing ──────────────────────────────────────────────────────

const pairingMenus: PairingMenu[] = [
  {
    menuId: 1,
    name: "Iced Latte",
    units: 94,
    status: "ok",
    pairs: [
      { addonId: 10, name: "Extra shot", units: 58, rate: 62 },
      { addonId: 11, name: "Oat milk", units: 20, rate: 21 },
    ],
  },
  {
    menuId: 2,
    name: "Cappuccino",
    units: 15,
    status: "ok",
    pairs: [{ addonId: 10, name: "Extra shot", units: 12, rate: 80 }],
  },
  { menuId: 3, name: "Mocha", units: 6, status: "notEnough", pairs: [] },
];

const pairingAddons: PairingAddon[] = [
  {
    addonId: 10,
    name: "Extra shot",
    menus: [
      { menuId: 2, name: "Cappuccino", units: 12, rate: 80 },
      { menuId: 1, name: "Iced Latte", units: 58, rate: 62 },
    ],
  },
];

describe("menuPairingView", () => {
  it("lists a menu's add-ons with the rate and the menu's units", () => {
    expect(menuPairingView(pairingMenus, 1).rows).toEqual([
      { id: 10, name: "Extra shot", rate: 62, menuUnits: 94, pairUnits: 58 },
      { id: 11, name: "Oat milk", rate: 21, menuUnits: 94, pairUnits: 20 },
    ]);
  });

  it("says the menu has enough data", () => {
    expect(menuPairingView(pairingMenus, 1).status).toBe("ok");
  });

  it("gives a menu below the minimum its real units and no rows", () => {
    expect(menuPairingView(pairingMenus, 3)).toEqual({
      status: "notEnough",
      units: 6,
      rows: [],
    });
  });

  it("reads a menu with no sales that month as 0 units, not enough", () => {
    expect(menuPairingView(pairingMenus, 99)).toEqual({
      status: "notEnough",
      units: 0,
      rows: [],
    });
  });

  it("gives an ok menu with no add-on chosen no rows", () => {
    const menus: PairingMenu[] = [
      { menuId: 4, name: "Tea", units: 12, status: "ok", pairs: [] },
    ];
    expect(menuPairingView(menus, 4)).toEqual({ status: "ok", units: 12, rows: [] });
  });
});

describe("addonPairingView", () => {
  it("lists the menus an add-on goes with, rate as the share of THAT menu", () => {
    expect(addonPairingView(pairingAddons, pairingMenus, 10)).toEqual([
      { id: 2, name: "Cappuccino", rate: 80, menuUnits: 15, pairUnits: 12 },
      { id: 1, name: "Iced Latte", rate: 62, menuUnits: 94, pairUnits: 58 },
    ]);
  });

  it("keeps only the top 3 menus", () => {
    const menus: PairingMenu[] = [1, 2, 3, 4].map((id) => ({
      menuId: id,
      name: `Menu ${id}`,
      units: 20,
      status: "ok" as const,
      pairs: [],
    }));
    const addons: PairingAddon[] = [
      {
        addonId: 10,
        name: "Extra shot",
        menus: [1, 2, 3, 4].map((id) => ({
          menuId: id,
          name: `Menu ${id}`,
          units: 10,
          rate: 50,
        })),
      },
    ];
    expect(addonPairingView(addons, menus, 10).map((row) => row.id)).toEqual([1, 2, 3]);
  });

  it("is empty for an add-on pairing doesn't list", () => {
    expect(addonPairingView(pairingAddons, pairingMenus, 99)).toEqual([]);
  });
});

describe("pairingMonthCaption", () => {
  it("names the current month as in progress", () => {
    expect(pairingMonthCaption(periodFor("month", TODAY), TODAY)).toBe(
      "September in progress",
    );
  });

  it("is null for a finished month", () => {
    expect(pairingMonthCaption(periodFor("month", "2026-08-10"), TODAY)).toBeNull();
  });
});

describe("printableReportHref", () => {
  it("opens the printable report for a week around a day", () => {
    expect(printableReportHref({ kind: "week", day: "2026-10-04" })).toBe(
      "/print/report?period=week&day=2026-10-04",
    );
  });

  it("opens the printable report for a month around a day", () => {
    expect(printableReportHref({ kind: "month", day: "2026-10-15" })).toBe(
      "/print/report?period=month&day=2026-10-15",
    );
  });
});

describe("printableReportTitle", () => {
  it("names a month", () => {
    expect(printableReportTitle(periodFor("month", "2026-10-15"))).toBe(
      "Monthly report — October 2026",
    );
  });

  it("names a week with its dates", () => {
    expect(printableReportTitle(periodFor("week", "2026-10-01"))).toBe(
      "Weekly report — Sep 28 – Oct 4, 2026",
    );
  });
});

describe("reportExportHref", () => {
  it("downloads a period's order lines", () => {
    expect(reportExportHref({ type: "lines", kind: "month", day: "2026-10-15" })).toBe(
      "/backoffice/reports/export?type=lines&period=month&day=2026-10-15",
    );
  });

  it("downloads a period's cancelled lines", () => {
    expect(reportExportHref({ type: "cancelled", kind: "week", day: "2026-10-04" })).toBe(
      "/backoffice/reports/export?type=cancelled&period=week&day=2026-10-04",
    );
  });
});
