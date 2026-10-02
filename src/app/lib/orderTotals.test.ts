import { describe, it, expect } from "vitest";
import {
  buildEntryBill,
  canPrintBill,
  cartLineTotal,
  cartLinesTotal,
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
