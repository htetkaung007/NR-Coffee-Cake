import { describe, it, expect } from "vitest";
import { buildPairing } from "./addonPairing";
import type { ReportLine, ReportLineAddon } from "./itemReport";

const ICED_LATTE = 1;
const CAPPUCCINO = 2;
const MOCHA = 3;
const EXTRA_SHOT = 10;
const OAT_MILK = 11;
const SYRUP = 12;
const WHIP = 13;
const SIZE_LARGE = 20;

function addon(addonId: number, isRequiredGroup = false): ReportLineAddon {
  return { addonId, unitPrice: 500, isRequiredGroup };
}

function line(
  menuId: number,
  quantity: number,
  addons: ReportLineAddon[] = [],
): ReportLine {
  return { menuId, quantity, unitPrice: 2000, addons };
}

describe("buildPairing — units and rates", () => {
  it("adds up the quantities of a menu's lines as its units", () => {
    const pairing = buildPairing([line(MOCHA, 6), line(MOCHA, 4)]);
    expect(pairing.byMenu[MOCHA].units).toBe(10);
  });

  it("rates an add-on as the units that had it ÷ the menu's units, in whole percent", () => {
    const pairing = buildPairing([
      line(MOCHA, 6, [addon(EXTRA_SHOT)]),
      line(MOCHA, 4),
    ]);
    expect(pairing.byMenu[MOCHA].pairs).toEqual([
      { addonId: EXTRA_SHOT, units: 6, rate: 60 },
    ]);
  });

  it("counts the units of every line of the menu that had the add-on", () => {
    const pairing = buildPairing([
      line(MOCHA, 3, [addon(EXTRA_SHOT)]),
      line(MOCHA, 5, [addon(EXTRA_SHOT)]),
      line(MOCHA, 2),
    ]);
    expect(pairing.byMenu[MOCHA].pairs[0]).toMatchObject({ units: 8, rate: 80 });
  });

  it("rounds the rate to the nearest whole percent", () => {
    // 58 of 94 = 61.7%.
    const pairing = buildPairing([
      line(ICED_LATTE, 58, [addon(EXTRA_SHOT)]),
      line(ICED_LATTE, 36),
    ]);
    expect(pairing.byMenu[ICED_LATTE].pairs[0].rate).toBe(62);
  });

  it("counts two add-ons on one line separately, and the line's units once", () => {
    const pairing = buildPairing([line(MOCHA, 10, [addon(EXTRA_SHOT), addon(OAT_MILK)])]);
    expect(pairing.byMenu[MOCHA].units).toBe(10);
    expect(pairing.byMenu[MOCHA].pairs).toHaveLength(2);
    expect(pairing.byMenu[MOCHA].pairs.map((pair) => pair.units)).toEqual([10, 10]);
  });

  it("keeps menus apart", () => {
    const pairing = buildPairing([
      line(MOCHA, 10, [addon(EXTRA_SHOT)]),
      line(CAPPUCCINO, 10),
    ]);
    expect(pairing.byMenu[CAPPUCCINO].pairs).toEqual([]);
    expect(pairing.byMenu[MOCHA].pairs).toHaveLength(1);
  });

  it("is empty when there are no lines", () => {
    expect(buildPairing([])).toEqual({ byMenu: {}, byAddon: {} });
  });
});

describe("buildPairing — the minimum", () => {
  it("analyses a menu with exactly 10 units", () => {
    const pairing = buildPairing([line(MOCHA, 10, [addon(EXTRA_SHOT)])]);
    expect(pairing.byMenu[MOCHA].status).toBe("ok");
    expect(pairing.byMenu[MOCHA].pairs).toHaveLength(1);
  });

  it("doesn't analyse a menu with 9 units", () => {
    const pairing = buildPairing([line(MOCHA, 9, [addon(EXTRA_SHOT)])]);
    expect(pairing.byMenu[MOCHA].status).toBe("notEnough");
    expect(pairing.byMenu[MOCHA].pairs).toEqual([]);
  });

  it("still returns the units of a menu below the minimum", () => {
    const pairing = buildPairing([line(MOCHA, 4, [addon(EXTRA_SHOT)]), line(MOCHA, 2)]);
    expect(pairing.byMenu[MOCHA]).toEqual({
      units: 6,
      status: "notEnough",
      pairs: [],
    });
  });

  it("counts a menu's lines together towards the minimum", () => {
    const pairing = buildPairing([line(MOCHA, 5), line(MOCHA, 5)]);
    expect(pairing.byMenu[MOCHA].status).toBe("ok");
  });

  it("keeps a menu that reached the minimum, with no add-ons chosen, as ok with no pairs", () => {
    const pairing = buildPairing([line(MOCHA, 12)]);
    expect(pairing.byMenu[MOCHA]).toEqual({ units: 12, status: "ok", pairs: [] });
  });
});

describe("buildPairing — required groups", () => {
  it("leaves a required-group add-on out of a menu's pairs", () => {
    const pairing = buildPairing([
      line(MOCHA, 10, [addon(SIZE_LARGE, true), addon(EXTRA_SHOT)]),
    ]);
    expect(pairing.byMenu[MOCHA].pairs.map((pair) => pair.addonId)).toEqual([
      EXTRA_SHOT,
    ]);
  });

  it("leaves a required-group add-on out of byAddon altogether", () => {
    const pairing = buildPairing([line(MOCHA, 10, [addon(SIZE_LARGE, true)])]);
    expect(pairing.byAddon).toEqual({});
  });

  it("doesn't let a required-group add-on change the menu's units", () => {
    const pairing = buildPairing([line(MOCHA, 10, [addon(SIZE_LARGE, true)])]);
    expect(pairing.byMenu[MOCHA].units).toBe(10);
  });
});

describe("buildPairing — ranking a menu's add-ons", () => {
  /** A menu of 100 units; `picks` is the units that had each add-on. */
  function menuWithPicks(picks: Record<number, number>) {
    const lines = Object.entries(picks).map(([addonId, units]) =>
      line(MOCHA, units, [addon(Number(addonId))]),
    );
    const used = Object.values(picks).reduce((sum, units) => sum + units, 0);
    return buildPairing([...lines, line(MOCHA, 100 - used)]);
  }

  it("lists the add-ons by rate, highest first", () => {
    const pairing = menuWithPicks({ [OAT_MILK]: 20, [EXTRA_SHOT]: 50, [SYRUP]: 30 });
    expect(pairing.byMenu[MOCHA].pairs.map((pair) => pair.addonId)).toEqual([
      EXTRA_SHOT,
      SYRUP,
      OAT_MILK,
    ]);
  });

  it("keeps only the top 3", () => {
    const pairing = menuWithPicks({
      [EXTRA_SHOT]: 40,
      [OAT_MILK]: 25,
      [SYRUP]: 20,
      [WHIP]: 10,
    });
    expect(pairing.byMenu[MOCHA].pairs.map((pair) => pair.addonId)).toEqual([
      EXTRA_SHOT,
      OAT_MILK,
      SYRUP,
    ]);
  });

  it("ranks equal whole-percent rates by more units, then by lower id", () => {
    // 300 units. Add-on 5 and 7 went with 150 of them (50.0%), add-on 6
    // with 151 (50.3%) — all three round to 50%.
    const pairing = buildPairing([
      line(MOCHA, 150, [addon(5), addon(6), addon(7)]),
      line(MOCHA, 1, [addon(6)]),
      line(MOCHA, 149),
    ]);
    const pairs = pairing.byMenu[MOCHA].pairs;
    expect(pairs.map((pair) => pair.rate)).toEqual([50, 50, 50]);
    expect(pairs.map((pair) => pair.addonId)).toEqual([6, 5, 7]);
  });

  it("breaks a tie at the cut-off the same way", () => {
    // 300 units, four add-ons at 50%: the fourth in line (same units as
    // 5 and 7, but the highest id) drops out.
    const pairing = buildPairing([
      line(MOCHA, 150, [addon(5), addon(6), addon(7), addon(8)]),
      line(MOCHA, 1, [addon(6)]),
      line(MOCHA, 149),
    ]);
    expect(pairing.byMenu[MOCHA].pairs.map((pair) => pair.addonId)).toEqual([
      6, 5, 7,
    ]);
  });
});

describe("buildPairing — byAddon", () => {
  // Iced Latte: 58 of 94 units had Extra shot (62%).
  // Cappuccino: 12 of 15 had it (80%) — fewer in count, higher by rate.
  const lines = [
    line(ICED_LATTE, 58, [addon(EXTRA_SHOT)]),
    line(ICED_LATTE, 36),
    line(CAPPUCCINO, 12, [addon(EXTRA_SHOT)]),
    line(CAPPUCCINO, 3),
  ];

  it("rates the same add-on per menu: 62% on the big menu, 80% on the small one", () => {
    const pairing = buildPairing(lines);
    const menus = pairing.byAddon[EXTRA_SHOT].menus;
    expect(menus.find((m) => m.menuId === ICED_LATTE)?.rate).toBe(62);
    expect(menus.find((m) => m.menuId === CAPPUCCINO)?.rate).toBe(80);
  });

  it("ranks the smaller menu first by rate even though its count is lower", () => {
    const pairing = buildPairing(lines);
    expect(pairing.byAddon[EXTRA_SHOT].menus).toEqual([
      { menuId: CAPPUCCINO, units: 12, rate: 80 },
      { menuId: ICED_LATTE, units: 58, rate: 62 },
    ]);
  });

  it("orders equal rates by more units, then by lower menu id", () => {
    const pairing = buildPairing([
      line(30, 10, [addon(EXTRA_SHOT)]), // 100%, 10 units
      line(20, 12, [addon(EXTRA_SHOT)]), // 100%, 12 units
      line(10, 10, [addon(EXTRA_SHOT)]), // 100%, 10 units
    ]);
    expect(pairing.byAddon[EXTRA_SHOT].menus.map((m) => m.menuId)).toEqual([
      20, 10, 30,
    ]);
  });

  it("lists only menus that reached the minimum", () => {
    const pairing = buildPairing([
      line(MOCHA, 9, [addon(EXTRA_SHOT)]),
      line(CAPPUCCINO, 10, [addon(EXTRA_SHOT)]),
    ]);
    expect(pairing.byAddon[EXTRA_SHOT].menus.map((m) => m.menuId)).toEqual([
      CAPPUCCINO,
    ]);
  });

  it("leaves out an add-on that only ever sold with menus below the minimum", () => {
    const pairing = buildPairing([line(MOCHA, 9, [addon(EXTRA_SHOT)])]);
    expect(pairing.byAddon).toEqual({});
  });

  it("lists a menu even where the add-on isn't in that menu's top 3", () => {
    // On this menu, Extra shot is the weakest of four add-ons (5%).
    const pairing = buildPairing([
      line(MOCHA, 40, [addon(OAT_MILK)]),
      line(MOCHA, 30, [addon(SYRUP)]),
      line(MOCHA, 20, [addon(WHIP)]),
      line(MOCHA, 5, [addon(EXTRA_SHOT)]),
      line(MOCHA, 5),
    ]);
    expect(pairing.byMenu[MOCHA].pairs.map((pair) => pair.addonId)).not.toContain(
      EXTRA_SHOT,
    );
    expect(pairing.byAddon[EXTRA_SHOT].menus).toEqual([
      { menuId: MOCHA, units: 5, rate: 5 },
    ]);
  });
});
