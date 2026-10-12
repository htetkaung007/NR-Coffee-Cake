import { describe, it, expect } from "vitest";
import {
  counterBillOccupancy,
  tableOccupancy,
  type OccupancyRound,
} from "./tableOccupancy";

// ── Fixtures ────────────────────────────────────────────────────────────

const COUNTER = { id: 1, isCounter: true };
const TABLE_3 = { id: 3, isCounter: false };
const TABLE_5 = { id: 5, isCounter: false };

/** One line: `quantity` × `unitPrice`, no add-ons. */
function lineOf(unitPrice: number, quantity = 1) {
  return {
    id: unitPrice,
    menuId: 9,
    quantity,
    unitPrice,
    note: null,
    menu: { name: "Latte" },
    OrdersAddons: [],
    voids: [],
  };
}

function round(
  tableId: number,
  status: string,
  orders = [lineOf(3000)],
  isCounter = false,
): OccupancyRound<string> {
  return {
    tableId,
    isCounter,
    status,
    orderNumber: `#A${tableId}`,
    createdAt: "2026-10-10T03:30:00.000Z",
    orders,
  };
}

function occupancyOf(
  tableId: number,
  rounds: OccupancyRound<string>[],
  tablesWithDraft: number[] = [],
) {
  return tableOccupancy({
    tables: [COUNTER, TABLE_3, TABLE_5],
    rounds,
    tablesWithDraft,
  }).find((entry) => entry.tableId === tableId);
}

// ── Rules ───────────────────────────────────────────────────────────────

describe("tableOccupancy", () => {
  it("a table with nothing open is free", () => {
    expect(occupancyOf(3, [])).toEqual({
      tableId: 3,
      status: "free",
      openOrderCount: 0,
      unpaidTotal: 0,
      hasPendingApproval: false,
    });
  });

  it("an accepted, unpaid round makes the table in use, with its bill total", () => {
    expect(occupancyOf(3, [round(3, "PENDING", [lineOf(3000, 2)])])).toEqual({
      tableId: 3,
      status: "inUse",
      openOrderCount: 1,
      unpaidTotal: 6000,
      hasPendingApproval: false,
    });
  });

  it("counts every open round, cooking ones too", () => {
    const entry = occupancyOf(3, [round(3, "PENDING"), round(3, "COOKING")]);
    expect(entry?.openOrderCount).toBe(2);
    expect(entry?.unpaidTotal).toBe(6000);
  });

  it("a round awaiting approval makes it in use, but isn't on the bill yet", () => {
    expect(occupancyOf(3, [round(3, "PENDING_APPROVAL")])).toMatchObject({
      status: "inUse",
      openOrderCount: 1,
      unpaidTotal: 0,
      hasPendingApproval: true,
    });
  });

  it("paid, rejected or expired rounds leave the table free", () => {
    expect(
      occupancyOf(3, [round(3, "PAID"), round(3, "CANCELLED"), round(3, "COMPLETED")]),
    ).toMatchObject({ status: "free", openOrderCount: 0, unpaidTotal: 0 });
  });

  it("an empty cart round doesn't count", () => {
    expect(occupancyOf(3, [round(3, "CART", [])])).toMatchObject({
      status: "free",
      openOrderCount: 0,
    });
  });

  it("a customer draft with lines makes it in use, with no order yet", () => {
    expect(occupancyOf(3, [], [3])).toMatchObject({
      status: "inUse",
      openOrderCount: 0,
      unpaidTotal: 0,
    });
  });

  it("only counts the table's own rounds", () => {
    expect(occupancyOf(5, [round(3, "PENDING")])).toMatchObject({ status: "free" });
  });

  it("leaves the counter out — it's always selectable, never in use", () => {
    const result = tableOccupancy({
      tables: [COUNTER, TABLE_3],
      rounds: [round(1, "PENDING", [lineOf(3000)], true)],
      tablesWithDraft: [],
    });
    expect(result.map((entry) => entry.tableId)).toEqual([3]);
  });

  it("a counter bill on the counter's table row never marks a table in use", () => {
    // Counter rounds carry the counter's tableId; they're never a table's.
    const sameId = { id: 3, isCounter: false };
    const result = tableOccupancy({
      tables: [sameId],
      rounds: [round(3, "PENDING", [lineOf(3000)], true)],
      tablesWithDraft: [],
    });
    expect(result[0]).toMatchObject({ status: "free" });
  });
});

describe("counterBillOccupancy", () => {
  const entry = (key: string, isTableGroup: boolean, sessions: OccupancyRound<string>[]) => ({
    key,
    title: "#A012",
    isTableGroup,
    sessions,
  });

  it("lists each open Counter bill by its root, with its bill total so far", () => {
    expect(
      counterBillOccupancy([
        entry("counter-12", false, [
          round(1, "PENDING", [lineOf(3000, 2)], true),
          round(1, "PENDING_APPROVAL", [lineOf(1500)], true),
        ]),
      ]),
    ).toEqual([
      {
        billRootId: 12,
        title: "#A012",
        openOrderCount: 2,
        // Only the accepted round is on the bill so far.
        unpaidTotal: 6000,
        hasPendingApproval: true,
      },
    ]);
  });

  it("leaves table entries out", () => {
    expect(counterBillOccupancy([entry("table-3", true, [round(3, "PENDING")])])).toEqual([]);
  });
});
