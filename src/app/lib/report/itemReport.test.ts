import { beforeEach, describe, it, expect } from "vitest";
import {
  aggregateItems,
  compareToPrevious,
  findSlowSellers,
  type ItemAggregate,
  rankItems,
  reconciles,
  type NamedMenuSalesRow,
  type ReportLine,
  type ReportLineAddon,
} from "./itemReport";
import { lineTotal } from "../order/orderTotals";

const LATTE = 1;
const MOCHA = 2;
const TEA = 3;
const EXTRA_SHOT = 10;
const OAT_MILK = 11;
const SIZE_LARGE = 20;

function addon(
  addonId: number,
  unitPrice: number,
  isRequiredGroup = false,
): ReportLineAddon {
  return { addonId, unitPrice, isRequiredGroup };
}

function line(
  menuId: number,
  quantity: number,
  unitPrice: number,
  addons: ReportLineAddon[] = [],
): ReportLine {
  return { menuId, quantity, unitPrice, addons };
}

const menuRow = <Row extends { menuId: number }>(rows: Row[], menuId: number) =>
  rows.find((row) => row.menuId === menuId);
const addonRow = <Row extends { addonId: number }>(
  rows: Row[],
  addonId: number,
) => rows.find((row) => row.addonId === addonId);

describe("aggregateItems — the worked example", () => {
  // Latte 2,000 + Extra shot 500, ×2 → the line costs 5,000.
  let result: ItemAggregate;
  beforeEach(() => {
    result = aggregateItems([line(LATTE, 2, 2000, [addon(EXTRA_SHOT, 500)])]);
  });

  it("counts the menu part only as item sales (2,000 × 2)", () => {
    expect(menuRow(result.menus, LATTE)).toEqual({
      menuId: LATTE,
      quantity: 2,
      itemSales: 4000,
    });
  });

  it("counts the add-on as add-on sales (500 × 2)", () => {
    expect(addonRow(result.addons, EXTRA_SHOT)).toEqual({
      addonId: EXTRA_SHOT,
      timesChosen: 2,
      addonSales: 1000,
    });
  });

  it("totals the two halves separately", () => {
    expect(result.itemsTotal).toBe(4000);
    expect(result.addonsTotal).toBe(1000);
  });

  it("makes items + add-ons equal the line's total by the shared line-total rule", () => {
    expect(result.itemsTotal + result.addonsTotal).toBe(
      lineTotal(2000, [500], 2),
    );
  });
});

describe("aggregateItems — menus", () => {
  it("merges several lines of the same menu into one row", () => {
    const result = aggregateItems([
      line(LATTE, 1, 2000),
      line(LATTE, 3, 2000, [addon(EXTRA_SHOT, 500)]),
    ]);
    expect(result.menus).toHaveLength(1);
    expect(menuRow(result.menus, LATTE)).toEqual({
      menuId: LATTE,
      quantity: 4,
      itemSales: 8000,
    });
  });

  it("prices each line at its own snapshot when the price changed between lines", () => {
    const result = aggregateItems([line(LATTE, 1, 2000), line(LATTE, 2, 2500)]);
    expect(menuRow(result.menus, LATTE)?.itemSales).toBe(7000); // 2,000 + 2 × 2,500
  });

  it("keeps different menus in separate rows", () => {
    const result = aggregateItems([line(LATTE, 2, 2000), line(MOCHA, 1, 3000)]);
    expect(result.menus).toHaveLength(2);
    expect(menuRow(result.menus, MOCHA)?.itemSales).toBe(3000);
  });
});

describe("aggregateItems — add-ons", () => {
  it("counts an add-on once per unit of the line that had it", () => {
    const result = aggregateItems([
      line(LATTE, 2, 2000, [addon(EXTRA_SHOT, 500)]),
      line(MOCHA, 3, 3000, [addon(EXTRA_SHOT, 500)]),
    ]);
    expect(addonRow(result.addons, EXTRA_SHOT)?.timesChosen).toBe(5);
  });

  it("prices each pick at its own snapshot when the add-on's price changed", () => {
    const result = aggregateItems([
      line(LATTE, 1, 2000, [addon(EXTRA_SHOT, 500)]),
      line(LATTE, 2, 2000, [addon(EXTRA_SHOT, 700)]),
    ]);
    expect(addonRow(result.addons, EXTRA_SHOT)?.addonSales).toBe(1900); // 500 + 2 × 700
  });

  it("counts two add-ons on one line separately", () => {
    const result = aggregateItems([
      line(LATTE, 2, 2000, [addon(EXTRA_SHOT, 500), addon(OAT_MILK, 700)]),
    ]);
    expect(addonRow(result.addons, EXTRA_SHOT)?.timesChosen).toBe(2);
    expect(addonRow(result.addons, OAT_MILK)?.addonSales).toBe(1400);
    expect(result.addonsTotal).toBe(2400);
  });

  it("includes add-ons from required groups, so the totals reconcile", () => {
    const result = aggregateItems([
      line(LATTE, 1, 2000, [addon(SIZE_LARGE, 800, true)]),
    ]);
    expect(addonRow(result.addons, SIZE_LARGE)?.addonSales).toBe(800);
    expect(result.itemsTotal + result.addonsTotal).toBe(2800);
  });

  it("leaves add-ons out for a line that has none", () => {
    const result = aggregateItems([line(LATTE, 2, 2000)]);
    expect(result.addons).toEqual([]);
    expect(result.addonsTotal).toBe(0);
  });
});

describe("aggregateItems — nothing sold", () => {
  it("is empty with totals of 0 for no lines", () => {
    expect(aggregateItems([])).toEqual({
      menus: [],
      addons: [],
      itemsTotal: 0,
      addonsTotal: 0,
    });
  });
});

function named(
  menuId: number,
  name: string,
  quantity: number,
  itemSales: number,
): NamedMenuSalesRow {
  return { menuId, name, quantity, itemSales };
}

describe("rankItems", () => {
  // Latte sells few units at a high price; Tea sells many at a low one.
  const latte = named(LATTE, "Latte", 2, 10000);
  const tea = named(TEA, "Tea", 9, 4500);
  const mocha = named(MOCHA, "Mocha", 5, 7500);

  it("puts the highest sales first when sorting by sales", () => {
    const ranked = rankItems([tea, latte, mocha], { sortBy: "sales" });
    expect(ranked.map((row) => row.menuId)).toEqual([LATTE, MOCHA, TEA]);
  });

  it("puts the most units first when sorting by quantity", () => {
    const ranked = rankItems([latte, tea, mocha], { sortBy: "quantity" });
    expect(ranked.map((row) => row.menuId)).toEqual([TEA, MOCHA, LATTE]);
  });

  it("gives each menu its share of the item sales, to one decimal", () => {
    const ranked = rankItems([latte, tea, mocha], { sortBy: "sales" });
    // 22,000 in total.
    expect(ranked.map((row) => row.share)).toEqual([45.5, 34.1, 20.5]);
  });

  it("makes the shares add up to about 100", () => {
    const ranked = rankItems([latte, tea, mocha], { sortBy: "sales" });
    const total = ranked.reduce((sum, row) => sum + row.share, 0);
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(0.15);
  });

  it("gives a share of 0 to every menu when nothing sold", () => {
    const ranked = rankItems(
      [named(LATTE, "Latte", 0, 0), named(TEA, "Tea", 0, 0)],
      { sortBy: "sales" },
    );
    expect(ranked.map((row) => row.share)).toEqual([0, 0]);
  });

  it("orders equal sales by name", () => {
    const ranked = rankItems(
      [named(MOCHA, "Mocha", 1, 3000), named(LATTE, "Latte", 1, 3000)],
      { sortBy: "sales" },
    );
    expect(ranked.map((row) => row.name)).toEqual(["Latte", "Mocha"]);
  });

  it("orders equal quantities by name", () => {
    const ranked = rankItems(
      [named(MOCHA, "Mocha", 4, 9000), named(LATTE, "Latte", 4, 1000)],
      { sortBy: "quantity" },
    );
    expect(ranked.map((row) => row.name)).toEqual(["Latte", "Mocha"]);
  });

  it("orders equal sales and equal names by id", () => {
    const ranked = rankItems(
      [named(7, "Special", 1, 3000), named(5, "Special", 1, 3000)],
      { sortBy: "sales" },
    );
    expect(ranked.map((row) => row.menuId)).toEqual([5, 7]);
  });

  it("gives the same order whichever way round the ties arrive", () => {
    const rows = [
      named(2, "Mocha", 1, 3000),
      named(1, "Latte", 1, 3000),
      named(3, "Tea", 1, 3000),
    ];
    const forwards = rankItems(rows, { sortBy: "sales" });
    const backwards = rankItems([...rows].reverse(), { sortBy: "sales" });
    expect(backwards.map((row) => row.menuId)).toEqual(
      forwards.map((row) => row.menuId),
    );
  });

  it("leaves the rows it was given untouched", () => {
    const rows = [tea, latte, mocha];
    rankItems(rows, { sortBy: "sales" });
    expect(rows.map((row) => row.menuId)).toEqual([TEA, LATTE, MOCHA]);
    expect(rows[0]).not.toHaveProperty("share");
  });
});

describe("findSlowSellers", () => {
  const sold = [
    { menuId: LATTE, quantity: 40 },
    { menuId: MOCHA, quantity: 3 },
    { menuId: TEA, quantity: 12 },
  ];

  it("lists the orderable menus that sold least, fewest first", () => {
    expect(findSlowSellers([LATTE, MOCHA, TEA], sold, 2)).toEqual([
      { menuId: MOCHA, quantity: 3 },
      { menuId: TEA, quantity: 12 },
    ]);
  });

  it("includes a menu with no sales at all, as 0", () => {
    const CAKE = 9;
    expect(findSlowSellers([LATTE, MOCHA, CAKE], sold, 2)).toEqual([
      { menuId: CAKE, quantity: 0 },
      { menuId: MOCHA, quantity: 3 },
    ]);
  });

  it("leaves out a menu that is no longer orderable, even if it sold", () => {
    expect(findSlowSellers([LATTE, TEA], sold, 3).map((row) => row.menuId)).toEqual(
      [TEA, LATTE],
    );
  });

  it("orders equal quantities by menu id", () => {
    const result = findSlowSellers([8, 4, 6], [], 3);
    expect(result.map((row) => row.menuId)).toEqual([4, 6, 8]);
  });

  it("returns every orderable menu when the limit is higher than their number", () => {
    expect(findSlowSellers([LATTE, MOCHA], sold, 10)).toHaveLength(2);
  });

  it("returns nothing for a limit of 0", () => {
    expect(findSlowSellers([LATTE, MOCHA], sold, 0)).toEqual([]);
  });
});

describe("compareToPrevious", () => {
  it("is the percent change in item sales on the previous period", () => {
    const changes = compareToPrevious(
      [{ menuId: LATTE, itemSales: 6000 }],
      [{ menuId: LATTE, itemSales: 4000 }],
    );
    expect(changes).toEqual([{ menuId: LATTE, deltaPercent: 50 }]);
  });

  it("is negative for a menu that sold less", () => {
    const changes = compareToPrevious(
      [{ menuId: MOCHA, itemSales: 3000 }],
      [{ menuId: MOCHA, itemSales: 4000 }],
    );
    expect(changes[0].deltaPercent).toBe(-25);
  });

  it("rounds to one decimal", () => {
    const changes = compareToPrevious(
      [{ menuId: LATTE, itemSales: 200 }],
      [{ menuId: LATTE, itemSales: 300 }],
    );
    expect(changes[0].deltaPercent).toBe(-33.3);
  });

  it("is null for a menu that is new this period", () => {
    const changes = compareToPrevious(
      [{ menuId: TEA, itemSales: 2000 }],
      [{ menuId: LATTE, itemSales: 4000 }],
    );
    expect(changes).toEqual([{ menuId: TEA, deltaPercent: null }]);
  });

  it("is null when the previous sales of that menu were 0", () => {
    const changes = compareToPrevious(
      [{ menuId: TEA, itemSales: 2000 }],
      [{ menuId: TEA, itemSales: 0 }],
    );
    expect(changes[0].deltaPercent).toBeNull();
  });

  it("lists only menus that sold this period", () => {
    const changes = compareToPrevious(
      [{ menuId: LATTE, itemSales: 6000 }],
      [
        { menuId: LATTE, itemSales: 4000 },
        { menuId: MOCHA, itemSales: 9000 },
      ],
    );
    expect(changes.map((change) => change.menuId)).toEqual([LATTE]);
  });

  it("is empty when nothing sold this period", () => {
    expect(compareToPrevious([], [{ menuId: LATTE, itemSales: 4000 }])).toEqual(
      [],
    );
  });
});

describe("reconciles", () => {
  it("is true when items + add-ons equal the bills' total", () => {
    expect(reconciles(4000, 1000, 5000)).toBe(true);
  });

  it("is false when the report adds up to even 1 less", () => {
    expect(reconciles(4000, 999, 5000)).toBe(false);
  });

  it("is false when the report adds up to even 1 more", () => {
    expect(reconciles(4000, 1001, 5000)).toBe(false);
  });

  it("is true when nothing was sold", () => {
    expect(reconciles(0, 0, 0)).toBe(true);
  });

  it("is true when the bills hold only add-ons or only items", () => {
    expect(reconciles(0, 800, 800)).toBe(true);
    expect(reconciles(2000, 0, 2000)).toBe(true);
  });
});
