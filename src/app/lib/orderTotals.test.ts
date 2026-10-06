import { describe, it, expect } from "vitest";
import {
  buildEntryBill,
  canPrintBill,
  cartLineTotal,
  cartLinesTotal,
  lineBreakdown,
  lineTotal,
  orderLineTotal,
  orderLinesTotal,
} from "./orderTotals";

describe("lineTotal", () => {
  it("multiplies the whole set (menu + add-ons) by quantity", () => {
    // Latte 2,000 + Extra shot 500, ×2 → 5,000 (not 4,500).
    expect(lineTotal(2000, [500], 2)).toBe(5000);
  });

  it("is the menu price × quantity when there are no add-ons", () => {
    expect(lineTotal(2000, [], 3)).toBe(6000);
  });

  it("counts the menu price and every add-on once at quantity 1", () => {
    expect(lineTotal(2000, [500, 300], 1)).toBe(2800);
  });
});

describe("orderLineTotal", () => {
  it("prices an Order row from its own price snapshots", () => {
    const order = {
      quantity: 2,
      unitPrice: 2000,
      OrdersAddons: [{ unitPrice: 500 }],
    };
    expect(orderLineTotal(order)).toBe(5000);
  });
});

describe("cartLineTotal", () => {
  it("prices a client cart line by the same rule as an Order row", () => {
    const line = { price: 2000, quantity: 2, addons: [{ unitPrice: 500 }] };
    expect(cartLineTotal(line)).toBe(5000);
  });
});

describe("orderLinesTotal", () => {
  it("sums the totals of several lines", () => {
    const orders = [
      { quantity: 2, unitPrice: 2000, OrdersAddons: [{ unitPrice: 500 }] },
      { quantity: 1, unitPrice: 3000, OrdersAddons: [] },
    ];
    expect(orderLinesTotal(orders)).toBe(8000);
  });

  it("is 0 for an empty list", () => {
    expect(orderLinesTotal([])).toBe(0);
  });
});

describe("cartLinesTotal", () => {
  it("sums the totals of several cart lines", () => {
    const lines = [
      { price: 2000, quantity: 2, addons: [{ unitPrice: 500 }] },
      { price: 3000, quantity: 1, addons: [] },
    ];
    expect(cartLinesTotal(lines)).toBe(8000);
  });

  it("is 0 for an empty cart", () => {
    expect(cartLinesTotal([])).toBe(0);
  });
});

/** One Order row as the bill reads it — `price × quantity`, no add-ons. */
function billLine(id: number, unitPrice: number, quantity = 1) {
  return {
    id,
    quantity,
    unitPrice,
    menu: { name: `Item ${id}` },
    OrdersAddons: [],
  };
}

function round(
  orderNumber: string,
  status: string,
  lines: ReturnType<typeof billLine>[],
) {
  return { orderNumber, status, createdAt: "2026-09-25T10:00:00Z", orders: lines };
}

describe("buildEntryBill", () => {
  const acceptedRound = round("#A001", "COOKING", [
    billLine(1, 2000, 2),
    billLine(2, 1500),
  ]);
  const pendingRound = round("#A002", "PENDING_APPROVAL", [billLine(3, 3000)]);

  it("counts only accepted rounds in the total", () => {
    const bill = buildEntryBill([acceptedRound, pendingRound]);
    expect(bill.total).toBe(5500);
  });

  it("lists a pending round with its amount, kept out of the total", () => {
    const bill = buildEntryBill([acceptedRound, pendingRound]);
    expect(bill.pendingRounds).toEqual([{ orderNumber: "#A002", amount: 3000 }]);
    expect(bill.pendingAmount).toBe(3000);
  });

  it("shows no line items for a round still awaiting approval", () => {
    const bill = buildEntryBill([acceptedRound, pendingRound]);
    expect(bill.acceptedRounds.map((r) => r.orderNumber)).toEqual(["#A001"]);
  });

  it("totals 0 when every round is still pending", () => {
    const bill = buildEntryBill([pendingRound]);
    expect(bill.total).toBe(0);
  });
});

describe("canPrintBill", () => {
  it("is false while every round is still awaiting approval", () => {
    expect(canPrintBill([{ status: "PENDING_APPROVAL" }])).toBe(false);
  });

  it("is true once at least one round has been accepted", () => {
    expect(
      canPrintBill([{ status: "PENDING_APPROVAL" }, { status: "PENDING" }]),
    ).toBe(true);
  });

  it("is false for an entry with no rounds", () => {
    expect(canPrintBill([])).toBe(false);
  });
});

describe("lineBreakdown", () => {
  /** The rows always add up to THE line total — never a second rule. */
  function expectSumsToLineTotal(line: Parameters<typeof lineBreakdown>[0]) {
    const sum = lineBreakdown(line).reduce((total, row) => total + row.amount, 0);
    expect(sum).toBe(
      lineTotal(
        line.unitPrice,
        line.addons.map((addon) => addon.unitPrice),
        line.quantity,
      ),
    );
  }

  it("splits Latte 2,000 + Extra shot 500, ×2 into 4,000 and 1,000", () => {
    const line = {
      name: "Latte",
      quantity: 2,
      unitPrice: 2000,
      addons: [{ name: "Extra shot", unitPrice: 500 }],
    };
    expect(lineBreakdown(line)).toEqual([
      { kind: "item", name: "Latte", quantity: 2, amount: 4000 },
      { kind: "addon", name: "Extra shot", quantity: 2, amount: 1000 },
    ]);
    expectSumsToLineTotal(line);
  });

  it("gives every add-on its own row, in order", () => {
    const line = {
      name: "Moat Hnin",
      quantity: 1,
      unitPrice: 3000,
      addons: [
        { name: "Default Addon1", unitPrice: 300 },
        { name: "Default Addon2", unitPrice: 0 },
      ],
    };
    expect(lineBreakdown(line).map((row) => [row.kind, row.name, row.amount])).toEqual([
      ["item", "Moat Hnin", 3000],
      ["addon", "Default Addon1", 300],
      ["addon", "Default Addon2", 0],
    ]);
    expectSumsToLineTotal(line);
  });

  it("is just the item row when there are no add-ons", () => {
    const line = { name: "Espresso", quantity: 3, unitPrice: 1500, addons: [] };
    expect(lineBreakdown(line)).toEqual([
      { kind: "item", name: "Espresso", quantity: 3, amount: 4500 },
    ]);
    expectSumsToLineTotal(line);
  });
});
