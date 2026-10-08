import { describe, it, expect } from "vitest";
import {
  decideSubmit,
  validateCartLines,
  type CartCatalog,
  type CartLineInput,
  type CartLineStatus,
  type CartValidationResult,
  type CatalogAddon,
  type CatalogMenu,
} from "./cartValidation";
import { lineTotal } from "../order/orderTotals";

// ── Fixtures ────────────────────────────────────────────────────────────
// A tiny one-location catalog. Everything is valid unless a test says
// otherwise, so each test only spells out what it's about.

const LATTE = 1;
const MOCHA = 2;
const EXTRA_SHOT = 10;
const OAT_MILK = 11;
const SIZE_SMALL = 20;
const SIZE_LARGE = 21;

function addon(price: number, overrides: Partial<CatalogAddon> = {}) {
  return { name: `Add-on ${price}`, price, isAvailable: true, ...overrides };
}

function menu(
  overrides: Partial<Omit<CatalogMenu, "allowedAddons">> & {
    addons?: Record<number, CatalogAddon>;
  } = {},
): CatalogMenu {
  const { addons = {}, ...rest } = overrides;
  return {
    name: "Latte",
    price: 2000,
    isOrderable: true,
    stockQuantity: 50,
    allowedAddons: new Map(
      Object.entries(addons).map(([id, value]) => [Number(id), value]),
    ),
    requiredAddonGroups: [],
    ...rest,
  };
}

function catalogOf(menus: Record<number, CatalogMenu>): CartCatalog {
  return new Map(
    Object.entries(menus).map(([id, value]) => [Number(id), value]),
  );
}

function line(
  menuId: number,
  overrides: Partial<CartLineInput> = {},
): CartLineInput {
  return { menuId, addonIds: [], quantity: 1, note: null, ...overrides };
}

/** Latte 2,000 (extra shot 500 allowed) and Mocha 3,000, plenty of stock. */
const catalog = catalogOf({
  [LATTE]: menu({ addons: { [EXTRA_SHOT]: addon(500) } }),
  [MOCHA]: menu({ name: "Mocha", price: 3000 }),
});

// ── Rules ───────────────────────────────────────────────────────────────

describe("validateCartLines — a valid cart", () => {
  const cart = [
    line(LATTE, { addonIds: [EXTRA_SHOT], quantity: 2 }),
    line(MOCHA),
  ];

  it("marks every line ok when nothing has changed", () => {
    const result = validateCartLines(cart, catalog);
    expect(result.lines.map((l) => l.status)).toEqual(["ok", "ok"]);
  });

  it("totals the lines with the shared lineTotal rule", () => {
    const result = validateCartLines(cart, catalog);
    expect(result.total).toBe(lineTotal(2000, [500], 2) + lineTotal(3000, [], 1));
  });

  it("allows submitting when every line is ok", () => {
    expect(validateCartLines(cart, catalog).canSubmit).toBe(true);
  });

  it("reports ok when the displayed price matches the current price", () => {
    const result = validateCartLines(
      [line(LATTE, { displayedUnitPrice: 2000 })],
      catalog,
    );
    expect(result.lines[0].status).toBe("ok");
  });
});

describe("validateCartLines — menu price changes", () => {
  const seenAt1800 = [line(LATTE, { quantity: 2, displayedUnitPrice: 1800 })];

  it("flags a line whose menu price changed since the customer saw it", () => {
    const [result] = validateCartLines(seenAt1800, catalog).lines;
    expect(result.status).toBe("priceChanged");
    expect(result.previousUnitPrice).toBe(1800);
  });

  it("prices a price-changed line at the current catalog price", () => {
    const [result] = validateCartLines(seenAt1800, catalog).lines;
    expect(result.unitPrice).toBe(2000);
    expect(result.lineTotal).toBe(lineTotal(2000, [], 2));
  });

  it("still allows submitting when the only change is a price change", () => {
    expect(validateCartLines(seenAt1800, catalog).canSubmit).toBe(true);
  });

  it("never reports a price change when no displayed price was sent", () => {
    const [result] = validateCartLines([line(LATTE)], catalog).lines;
    expect(result.status).toBe("ok");
  });

  it("never lets a tampered displayed price lower the total", () => {
    const result = validateCartLines(
      [line(LATTE, { quantity: 2, displayedUnitPrice: 1 })],
      catalog,
    );
    expect(result.total).toBe(lineTotal(2000, [], 2));
  });

  it("reports a blocking problem rather than a price change when a line has both", () => {
    const lowStock = catalogOf({ [LATTE]: menu({ stockQuantity: 1 }) });
    const result = validateCartLines(
      [line(LATTE, { quantity: 2, displayedUnitPrice: 1800 })],
      lowStock,
    );
    expect(result.lines[0].status).toBe("insufficientStock");
    expect(result.canSubmit).toBe(false);
  });
});

describe("validateCartLines — add-on price changes", () => {
  it("charges an add-on at its current price, not the one the customer saw", () => {
    // Menu 2,000 + extra shot now 700 (was 500), ×2 → 5,400.
    const repriced = catalogOf({
      [LATTE]: menu({ addons: { [EXTRA_SHOT]: addon(700) } }),
    });
    const result = validateCartLines(
      [line(LATTE, { addonIds: [EXTRA_SHOT], quantity: 2 })],
      repriced,
    );
    expect(result.lines[0].lineTotal).toBe(5400);
    expect(result.total).toBe(5400);
  });
});

describe("validateCartLines — stock", () => {
  const stockOf3 = catalogOf({
    [LATTE]: menu({ stockQuantity: 3 }),
    [MOCHA]: menu({ name: "Mocha", price: 3000 }),
  });

  it("flags a line asking for more than the stock, with the quantity available", () => {
    const [result] = validateCartLines(
      [line(LATTE, { quantity: 4 })],
      stockOf3,
    ).lines;
    expect(result.status).toBe("insufficientStock");
    expect(result.availableQuantity).toBe(3);
  });

  it("accepts a line asking for exactly the stock", () => {
    const [result] = validateCartLines(
      [line(LATTE, { quantity: 3 })],
      stockOf3,
    ).lines;
    expect(result.status).toBe("ok");
  });

  it("marks a line of a menu with no stock as soldOut", () => {
    const noStock = catalogOf({ [LATTE]: menu({ stockQuantity: 0 }) });
    const [result] = validateCartLines([line(LATTE)], noStock).lines;
    expect(result.status).toBe("soldOut");
  });

  it("blocks submitting when a line has insufficient stock", () => {
    const result = validateCartLines([line(LATTE, { quantity: 4 })], stockOf3);
    expect(result.canSubmit).toBe(false);
  });

  it("blocks submitting when a line is sold out", () => {
    const noStock = catalogOf({ [LATTE]: menu({ stockQuantity: 0 }) });
    expect(validateCartLines([line(LATTE)], noStock).canSubmit).toBe(false);
  });

  it("leaves stock-blocked lines out of the total", () => {
    const result = validateCartLines(
      [line(LATTE, { quantity: 4 }), line(MOCHA)],
      stockOf3,
    );
    expect(result.total).toBe(lineTotal(3000, [], 1));
  });

  it("flags every line of a menu whose combined quantity exceeds its stock", () => {
    // Same menu, different notes → separate lines sharing one stock:
    // 2 + 2 = 4 > 3.
    const result = validateCartLines(
      [
        line(LATTE, { quantity: 2, note: "less sugar" }),
        line(LATTE, { quantity: 2, note: "extra hot" }),
      ],
      stockOf3,
    );
    expect(result.lines.map((l) => l.status)).toEqual([
      "insufficientStock",
      "insufficientStock",
    ]);
    expect(result.lines.map((l) => l.availableQuantity)).toEqual([3, 3]);
  });

  it("accepts lines of one menu whose combined quantity fits its stock", () => {
    const result = validateCartLines(
      [
        line(LATTE, { quantity: 2, note: "less sugar" }),
        line(LATTE, { quantity: 1, note: "extra hot" }),
      ],
      stockOf3,
    );
    expect(result.lines.map((l) => l.status)).toEqual(["ok", "ok"]);
  });

  it("counts stock per menu, so one menu's shortage doesn't flag another menu", () => {
    const result = validateCartLines(
      [line(LATTE, { quantity: 4 }), line(MOCHA, { quantity: 4 })],
      stockOf3,
    );
    expect(result.lines[1].status).toBe("ok");
  });
});

describe("validateCartLines — menu availability", () => {
  it("marks a line whose menu isn't in this location's catalog as unavailable", () => {
    const [result] = validateCartLines([line(999)], catalog).lines;
    expect(result.status).toBe("unavailable");
  });

  it("marks a line whose menu isn't orderable here as unavailable", () => {
    const notOrderable = catalogOf({ [LATTE]: menu({ isOrderable: false }) });
    const [result] = validateCartLines([line(LATTE)], notOrderable).lines;
    expect(result.status).toBe("unavailable");
  });

  it("blocks submitting when a line is unavailable", () => {
    expect(validateCartLines([line(999)], catalog).canSubmit).toBe(false);
  });

  it("leaves unavailable lines out of the total", () => {
    const result = validateCartLines([line(999), line(MOCHA)], catalog);
    expect(result.total).toBe(lineTotal(3000, [], 1));
  });
});

describe("validateCartLines — add-ons", () => {
  const withAddons = catalogOf({
    [LATTE]: menu({
      addons: {
        [EXTRA_SHOT]: addon(500),
        [SIZE_SMALL]: addon(0),
        [SIZE_LARGE]: addon(800),
      },
      requiredAddonGroups: [
        { name: "Size", addonIds: [SIZE_SMALL, SIZE_LARGE] },
      ],
    }),
    // Oat milk exists, but only on Mocha.
    [MOCHA]: menu({
      name: "Mocha",
      price: 3000,
      addons: { [OAT_MILK]: addon(700) },
    }),
  });

  it("flags a line with an add-on that no longer exists", () => {
    const [result] = validateCartLines(
      [line(LATTE, { addonIds: [SIZE_SMALL, 999] })],
      withAddons,
    ).lines;
    expect(result.status).toBe("addonUnavailable");
  });

  it("flags a line with an add-on that isn't allowed on its menu", () => {
    const [result] = validateCartLines(
      [line(LATTE, { addonIds: [SIZE_SMALL, OAT_MILK] })],
      withAddons,
    ).lines;
    expect(result.status).toBe("addonUnavailable");
  });

  it("flags a line with an add-on that is marked unavailable", () => {
    const shotOff = catalogOf({
      [LATTE]: menu({
        addons: { [EXTRA_SHOT]: addon(500, { isAvailable: false }) },
      }),
    });
    const [result] = validateCartLines(
      [line(LATTE, { addonIds: [EXTRA_SHOT] })],
      shotOff,
    ).lines;
    expect(result.status).toBe("addonUnavailable");
  });

  it("flags a line that picks nothing from a required add-on group", () => {
    const [result] = validateCartLines(
      [line(LATTE, { addonIds: [EXTRA_SHOT] })],
      withAddons,
    ).lines;
    expect(result.status).toBe("addonUnavailable");
  });

  it("accepts a required add-on group satisfied by any one of its add-ons", () => {
    const [result] = validateCartLines(
      [line(LATTE, { addonIds: [SIZE_LARGE, EXTRA_SHOT] })],
      withAddons,
    ).lines;
    expect(result.status).toBe("ok");
  });

  it("blocks submitting when a line has an add-on problem", () => {
    const result = validateCartLines(
      [line(LATTE, { addonIds: [SIZE_SMALL, 999] })],
      withAddons,
    );
    expect(result.canSubmit).toBe(false);
  });
});

describe("validateCartLines — quantity", () => {
  // Same bounds as customerOrderSchema's `quantity`: a whole number 1–99.
  // Stock above the largest quantity, so only the quantity rule can
  // decide these lines — never the stock rule.
  const plentyOfStock = catalogOf({ [LATTE]: menu({ stockQuantity: 100 }) });

  it.each([0, -1, 1.5, 100])("marks a quantity of %s as invalid", (quantity) => {
    const [result] = validateCartLines(
      [line(LATTE, { quantity })],
      plentyOfStock,
    ).lines;
    expect(result.status).toBe("invalid");
  });

  it("accepts the largest allowed quantity of 99", () => {
    const [result] = validateCartLines(
      [line(LATTE, { quantity: 99 })],
      plentyOfStock,
    ).lines;
    expect(result.status).toBe("ok");
  });

  it("blocks submitting when a line has an invalid quantity", () => {
    const result = validateCartLines([line(LATTE, { quantity: 0 })], catalog);
    expect(result.canSubmit).toBe(false);
  });
});

describe("validateCartLines — the cart as a whole", () => {
  it("returns no lines and a total of 0 for an empty cart", () => {
    const result = validateCartLines([], catalog);
    expect(result.lines).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("does not allow submitting an empty cart", () => {
    expect(validateCartLines([], catalog).canSubmit).toBe(false);
  });

  it("reports each result at the index of its input line", () => {
    const result = validateCartLines(
      [line(MOCHA), line(999), line(LATTE, { quantity: 0 })],
      catalog,
    );
    expect(result.lines.map((l) => [l.index, l.status])).toEqual([
      [0, "ok"],
      [1, "unavailable"],
      [2, "invalid"],
    ]);
  });
});

// ── Submit decision ─────────────────────────────────────────────────────

/** A validation result with one line per status (prices don't matter to
 *  the decision). canSubmit is set the way validateCartLines sets it. */
function resultWith(...statuses: CartLineStatus[]): CartValidationResult {
  const submittable = statuses.every(
    (status) => status === "ok" || status === "priceChanged",
  );
  return {
    lines: statuses.map((status, index) => ({
      index,
      status,
      name: "Latte",
      unitPrice: 2000,
      addonPrices: [],
      lineTotal: 2000,
    })),
    total: 0,
    canSubmit: statuses.length > 0 && submittable,
  };
}

describe("decideSubmit", () => {
  it("submits when every line is ok", () => {
    expect(decideSubmit(resultWith("ok", "ok"))).toBe("ok");
  });

  it("stops for a price change the customer hasn't seen yet", () => {
    expect(decideSubmit(resultWith("ok", "priceChanged"))).toBe("pricesChanged");
  });

  it("needs attention when any line is blocked", () => {
    expect(decideSubmit(resultWith("ok", "soldOut"))).toBe("needsAttention");
  });

  it("puts a blocked line before a price change", () => {
    expect(decideSubmit(resultWith("priceChanged", "insufficientStock"))).toBe(
      "needsAttention",
    );
  });

  it.each<CartLineStatus>([
    "insufficientStock",
    "soldOut",
    "unavailable",
    "addonUnavailable",
    "invalid",
  ])("needs attention for a %s line", (status) => {
    expect(decideSubmit(resultWith(status))).toBe("needsAttention");
  });

  it("needs attention for an empty cart", () => {
    expect(decideSubmit(resultWith())).toBe("needsAttention");
  });
});
