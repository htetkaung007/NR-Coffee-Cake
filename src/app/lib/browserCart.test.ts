import { describe, it, expect } from "vitest";
import {
  addLine,
  applyValidation,
  clear,
  emptyCart,
  itemCount,
  parseCart,
  removeLine,
  setQuantity,
  toBrowserCartLine,
  toServerLines,
  updateLine,
  type BrowserCart,
  type BrowserCartLine,
} from "./browserCart";
import type { CartValidationResult } from "./cartValidation";

// ── Fixtures ────────────────────────────────────────────────────────────

const LOCATION = 7;
const LATTE = 1;
const MOCHA = 2;
const EXTRA_SHOT = 10;
const OAT_MILK = 11;
const SIZE_LARGE_ID = 21;
const T1 = "2026-09-30T10:00:00.000Z";
const T2 = "2026-09-30T10:05:00.000Z";
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";

const ADDON_DISPLAY: Record<number, { name: string; unitPrice: number }> = {
  [EXTRA_SHOT]: { name: "Extra shot", unitPrice: 500 },
  [OAT_MILK]: { name: "Oat milk", unitPrice: 700 },
};

function line(
  menuId: number,
  overrides: Partial<Omit<BrowserCartLine, "display">> = {},
): BrowserCartLine {
  const addonIds = overrides.addonIds ?? [];
  return {
    menuId,
    addonIds,
    quantity: 1,
    note: null,
    ...overrides,
    display: {
      name: menuId === LATTE ? "Latte" : "Mocha",
      unitPrice: menuId === LATTE ? 2000 : 3000,
      addons: addonIds.map((id) => ({ id, ...ADDON_DISPLAY[id] })),
      imageUrl: null,
    },
  };
}

/** A fresh id generator that fails the test if called more than expected. */
function ids(...values: string[]) {
  const queue = [...values];
  return () => {
    const next = queue.shift();
    if (!next) throw new Error("newId called more often than expected");
    return next;
  };
}

function cartWith(...lines: BrowserCartLine[]): BrowserCart {
  return lines.reduce(
    (cart, next) => addLine(cart, next, T1, ids(ID_A)),
    emptyCart(LOCATION),
  );
}

function resultFor(
  lines: {
    name?: string | null;
    unitPrice?: number | null;
    addonPrices?: number[];
  }[],
): CartValidationResult {
  return {
    lines: lines.map((l, index) => ({
      index,
      status: "ok",
      name: l.name === undefined ? "Latte" : l.name,
      unitPrice: l.unitPrice === undefined ? 2000 : l.unitPrice,
      addonPrices: l.addonPrices ?? [],
      lineTotal: 0,
    })),
    total: 0,
    canSubmit: true,
  };
}

// ── Rules ───────────────────────────────────────────────────────────────

describe("emptyCart", () => {
  it("starts with no lines and no request id", () => {
    const cart = emptyCart(LOCATION);
    expect(cart.lines).toEqual([]);
    expect(cart.clientRequestId).toBeNull();
    expect(cart.locationId).toBe(LOCATION);
  });
});

describe("addLine", () => {
  it("adds a line to an empty cart", () => {
    const cart = addLine(emptyCart(LOCATION), line(LATTE), T1, ids(ID_A));
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].menuId).toBe(LATTE);
  });

  it("merges an identical add into one line with the quantities summed", () => {
    const cart = addLine(cartWith(line(LATTE)), line(LATTE), T2, ids());
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(2);
  });

  it("treats the same add-ons in a different order as identical", () => {
    const first = line(LATTE, { addonIds: [EXTRA_SHOT, OAT_MILK] });
    const second = line(LATTE, { addonIds: [OAT_MILK, EXTRA_SHOT] });
    const cart = addLine(cartWith(first), second, T2, ids());
    expect(cart.lines).toHaveLength(1);
  });

  it("treats notes differing only in case and spacing as identical", () => {
    const cart = addLine(
      cartWith(line(LATTE, { note: "Extra hot" })),
      line(LATTE, { note: "extra  hot" }),
      T2,
      ids(),
    );
    expect(cart.lines).toHaveLength(1);
  });

  it("keeps a line with a different note separate", () => {
    const cart = addLine(
      cartWith(line(LATTE, { note: "less sugar" })),
      line(LATTE, { note: "no sugar" }),
      T2,
      ids(),
    );
    expect(cart.lines).toHaveLength(2);
  });

  it("keeps a line with different add-ons separate", () => {
    const cart = addLine(
      cartWith(line(LATTE)),
      line(LATTE, { addonIds: [EXTRA_SHOT] }),
      T2,
      ids(),
    );
    expect(cart.lines).toHaveLength(2);
  });

  it("stores a blank note as no note", () => {
    const cart = addLine(
      emptyCart(LOCATION),
      line(LATTE, { note: "   " }),
      T1,
      ids(ID_A),
    );
    expect(cart.lines[0].note).toBeNull();
  });

  it("sets a request id when the first line is added", () => {
    const cart = addLine(emptyCart(LOCATION), line(LATTE), T1, ids(ID_A));
    expect(cart.clientRequestId).toBe(ID_A);
  });

  it("keeps the request id when more lines are added", () => {
    const cart = addLine(cartWith(line(LATTE)), line(MOCHA), T2, ids(ID_B));
    expect(cart.clientRequestId).toBe(ID_A);
  });

  it("stamps the time of the change", () => {
    const cart = addLine(cartWith(line(LATTE)), line(MOCHA), T2, ids());
    expect(cart.updatedAt).toBe(T2);
  });
});

describe("setQuantity", () => {
  it("sets a line's quantity", () => {
    const cart = setQuantity(cartWith(line(LATTE)), 0, 3, T2);
    expect(cart.lines[0].quantity).toBe(3);
  });

  it("removes the line when the quantity drops to 0", () => {
    const cart = setQuantity(cartWith(line(LATTE), line(MOCHA)), 0, 0, T2);
    expect(cart.lines.map((l) => l.menuId)).toEqual([MOCHA]);
  });

  it("keeps the request id while lines are edited (e.g. after a failed submit)", () => {
    const cart = setQuantity(cartWith(line(LATTE)), 0, 4, T2);
    expect(cart.clientRequestId).toBe(ID_A);
  });
});

describe("removeLine", () => {
  it("removes only the line at the given position", () => {
    const cart = removeLine(cartWith(line(LATTE), line(MOCHA)), 1, T2);
    expect(cart.lines.map((l) => l.menuId)).toEqual([LATTE]);
  });

  it("drops the request id once the last line is gone", () => {
    const cart = removeLine(cartWith(line(LATTE)), 0, T2);
    expect(cart.clientRequestId).toBeNull();
  });
});

describe("updateLine", () => {
  it("changes a line's add-ons and note", () => {
    const edited = line(LATTE, { addonIds: [EXTRA_SHOT], note: "hot" });
    const cart = updateLine(cartWith(line(LATTE)), 0, edited, T2);
    expect(cart.lines[0].addonIds).toEqual([EXTRA_SHOT]);
    expect(cart.lines[0].note).toBe("hot");
  });

  it("merges the line into another it has become identical to", () => {
    const cart = cartWith(
      line(LATTE, { addonIds: [EXTRA_SHOT], quantity: 2 }),
      line(LATTE, { quantity: 1 }),
    );
    const updated = updateLine(
      cart,
      1,
      line(LATTE, { addonIds: [EXTRA_SHOT], quantity: 1 }),
      T2,
    );
    expect(updated.lines).toHaveLength(1);
    expect(updated.lines[0].quantity).toBe(3);
  });
});

describe("clear", () => {
  it("removes every line and the request id", () => {
    const cart = clear(cartWith(line(LATTE), line(MOCHA)), T2);
    expect(cart.lines).toEqual([]);
    expect(cart.clientRequestId).toBeNull();
  });

  it("gives the next cart a fresh request id", () => {
    const cleared = clear(cartWith(line(LATTE)), T2);
    const cart = addLine(cleared, line(LATTE), T2, ids(ID_B));
    expect(cart.clientRequestId).toBe(ID_B);
  });
});

describe("applyValidation", () => {
  it("refreshes a line's name and unit price from the server", () => {
    const cart = applyValidation(
      cartWith(line(LATTE)),
      resultFor([{ name: "Café Latte", unitPrice: 2200 }]),
    );
    expect(cart.lines[0].display.name).toBe("Café Latte");
    expect(cart.lines[0].display.unitPrice).toBe(2200);
  });

  it("refreshes add-on prices from the server", () => {
    const cart = applyValidation(
      cartWith(line(LATTE, { addonIds: [EXTRA_SHOT] })),
      resultFor([{ addonPrices: [700] }]),
    );
    expect(cart.lines[0].display.addons[0].unitPrice).toBe(700);
  });

  it("keeps the shown values of a line the server couldn't price", () => {
    const cart = applyValidation(
      cartWith(line(LATTE)),
      resultFor([{ name: null, unitPrice: null }]),
    );
    expect(cart.lines[0].display.name).toBe("Latte");
    expect(cart.lines[0].display.unitPrice).toBe(2000);
  });

  it("matches results to lines by position", () => {
    const cart = applyValidation(
      cartWith(line(LATTE), line(MOCHA)),
      resultFor([{}, { name: "Mocha", unitPrice: 3300 }]),
    );
    expect(cart.lines.map((l) => l.display.unitPrice)).toEqual([2000, 3300]);
  });

  it("ignores a result that doesn't match the cart's lines", () => {
    const cart = cartWith(line(LATTE), line(MOCHA));
    expect(applyValidation(cart, resultFor([{ unitPrice: 1 }]))).toEqual(cart);
  });
});

describe("itemCount", () => {
  it("sums the quantities of every line", () => {
    const cart = cartWith(line(LATTE, { quantity: 2 }), line(MOCHA));
    expect(itemCount(cart)).toBe(3);
  });

  it("is 0 for an empty cart", () => {
    expect(itemCount(emptyCart(LOCATION))).toBe(0);
  });
});

describe("toServerLines", () => {
  it("sends the choices and the shown price, never the other display data", () => {
    const cart = cartWith(
      line(LATTE, { addonIds: [EXTRA_SHOT], quantity: 2, note: "hot" }),
    );
    expect(toServerLines(cart)).toEqual([
      {
        menuId: LATTE,
        addonIds: [EXTRA_SHOT],
        quantity: 2,
        note: "hot",
        displayedUnitPrice: 2000,
      },
    ]);
  });
});

describe("parseCart", () => {
  const storedCart = () => cartWith(line(LATTE, { addonIds: [EXTRA_SHOT] }));

  it("reads back a stored cart", () => {
    const stored = storedCart();
    expect(parseCart(JSON.stringify(stored), LOCATION)).toEqual(stored);
  });

  it("returns an empty cart when nothing is stored", () => {
    expect(parseCart(null, LOCATION)).toEqual(emptyCart(LOCATION));
  });

  it("returns an empty cart for text that isn't JSON", () => {
    expect(parseCart("{not json", LOCATION)).toEqual(emptyCart(LOCATION));
  });

  it("returns an empty cart for JSON of the wrong shape", () => {
    expect(parseCart('{"lines":"nope"}', LOCATION)).toEqual(emptyCart(LOCATION));
  });

  it("returns an empty cart for a different version", () => {
    const raw = JSON.stringify({ ...storedCart(), version: 2 });
    expect(parseCart(raw, LOCATION)).toEqual(emptyCart(LOCATION));
  });

  it("returns an empty cart stored for a different location", () => {
    expect(parseCart(JSON.stringify(storedCart()), LOCATION + 1)).toEqual(
      emptyCart(LOCATION + 1),
    );
  });
});

describe("toBrowserCartLine", () => {
  const detail = {
    id: LATTE,
    name: "Latte",
    price: 2000,
    imageUrl: "/latte.jpg",
    addonCategories: [
      { addons: [{ id: SIZE_LARGE_ID, name: "Large", price: 800 }] },
      {
        addons: [
          { id: EXTRA_SHOT, name: "Extra shot", price: 500 },
          { id: OAT_MILK, name: "Oat milk", price: 700 },
        ],
      },
    ],
  };

  it("keeps the customer's choices", () => {
    const built = toBrowserCartLine(detail, 2, [OAT_MILK], "hot");
    expect(built).toMatchObject({
      menuId: LATTE,
      addonIds: [OAT_MILK],
      quantity: 2,
      note: "hot",
    });
  });

  it("shows the menu's current name, price and photo", () => {
    const built = toBrowserCartLine(detail, 1, [], "");
    expect(built.display).toMatchObject({
      name: "Latte",
      unitPrice: 2000,
      imageUrl: "/latte.jpg",
    });
  });

  it("shows each picked add-on's name and price, in the order picked", () => {
    const built = toBrowserCartLine(detail, 1, [OAT_MILK, SIZE_LARGE_ID], "");
    expect(built.display.addons).toEqual([
      { id: OAT_MILK, name: "Oat milk", unitPrice: 700 },
      { id: SIZE_LARGE_ID, name: "Large", unitPrice: 800 },
    ]);
  });

  it("leaves out an add-on id the menu doesn't offer", () => {
    const built = toBrowserCartLine(detail, 1, [999], "");
    expect(built.addonIds).toEqual([]);
    expect(built.display.addons).toEqual([]);
  });
});
