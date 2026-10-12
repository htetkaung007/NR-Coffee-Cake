import { describe, it, expect } from "vitest";
import {
  effectiveItemCount,
  effectiveQuantity,
  isVoidableRoundStatus,
  planVoid,
  voidedByLabel,
  voidedQuantity,
  voidStaffName,
  VOID_STAFF_NAME_MAX_LENGTH,
  voidReasonLabel,
  VOID_REASONS,
} from "./voids";
import { buildEntryBill, orderLineTotal, orderLinesTotal } from "./orderTotals";
import { mergeLinesForDisplay } from "./orderLineMerge";

// ── Fixtures ────────────────────────────────────────────────────────────

/** A Latte line: 2,000 + an Extra shot at 500, `quantity` of them. */
function latte(
  id: number,
  quantity: number,
  voids: { quantity: number }[] = [],
) {
  return {
    id,
    menuId: 1,
    quantity,
    unitPrice: 2000,
    note: null as string | null,
    menu: { name: "Latte" },
    OrdersAddons: [{ addonId: 9, unitPrice: 500, addon: { name: "Extra shot" } }],
    voids,
  };
}

function round(status: string, orders: ReturnType<typeof latte>[]) {
  return { orderNumber: "#A001", createdAt: "2026-10-10T03:30:00.000Z", status, orders };
}

// ── Quantities ──────────────────────────────────────────────────────────

describe("voidedQuantity", () => {
  it("adds up every void on the line", () => {
    expect(voidedQuantity([{ quantity: 1 }, { quantity: 2 }])).toBe(3);
  });

  it("is 0 with no voids", () => {
    expect(voidedQuantity([])).toBe(0);
  });
});

describe("effectiveQuantity", () => {
  it("is the quantity less what was voided — void 1 of 3 leaves 2", () => {
    expect(effectiveQuantity({ quantity: 3, voids: [{ quantity: 1 }] })).toBe(2);
  });

  it("never goes below 0", () => {
    expect(effectiveQuantity({ quantity: 1, voids: [{ quantity: 2 }] })).toBe(0);
  });
});

describe("effectiveItemCount", () => {
  it("counts only what's still on the order", () => {
    expect(
      effectiveItemCount([latte(1, 2, [{ quantity: 1 }]), latte(2, 3)]),
    ).toBe(4);
  });
});

describe("isVoidableRoundStatus", () => {
  it("allows accepted rounds still open — pending or cooking", () => {
    expect(isVoidableRoundStatus("PENDING")).toBe(true);
    expect(isVoidableRoundStatus("COOKING")).toBe(true);
  });

  it("never a round awaiting approval (that's Reject), unsent, paid, completed or cancelled", () => {
    for (const status of ["PENDING_APPROVAL", "CART", "PAID", "COMPLETED", "CANCELLED"]) {
      expect(isVoidableRoundStatus(status)).toBe(false);
    }
  });
});

describe("planVoid", () => {
  it("takes the units from the first row that still has them", () => {
    expect(planVoid([latte(1, 3)], 1)).toEqual([{ orderId: 1, quantity: 1 }]);
  });

  it("spreads over a merged line's rows in order, skipping what's already voided", () => {
    const rows = [latte(1, 2, [{ quantity: 1 }]), latte(2, 2)];
    expect(planVoid(rows, 3)).toEqual([
      { orderId: 1, quantity: 1 },
      { orderId: 2, quantity: 2 },
    ]);
  });

  it("refuses more than is left", () => {
    expect(planVoid([latte(1, 2, [{ quantity: 1 }])], 2)).toBeNull();
  });

  it("refuses 0, negative or fractional quantities", () => {
    expect(planVoid([latte(1, 3)], 0)).toBeNull();
    expect(planVoid([latte(1, 3)], -1)).toBeNull();
    expect(planVoid([latte(1, 3)], 1.5)).toBeNull();
  });
});

describe("voidReasonLabel", () => {
  it("has a plain label for every reason", () => {
    expect(VOID_REASONS.map(voidReasonLabel)).toEqual([
      "Customer changed mind",
      "Wrong item",
      "Other",
    ]);
  });
});

// ── Money (the bill's own rule, lib/order/orderTotals) ──────────────────

describe("a line's total after voids", () => {
  it("charges only the units still on it — add-ons included, at the line's snapshot price", () => {
    // 2 × (2,000 + 500), one voided → 2,500.
    expect(orderLineTotal(latte(1, 2, [{ quantity: 1 }]))).toBe(2500);
  });

  it("charges nothing once every unit is voided", () => {
    expect(orderLineTotal(latte(1, 2, [{ quantity: 2 }]))).toBe(0);
  });
});

describe("the bill total excluding voided units", () => {
  it("drops by exactly the voided units", () => {
    const before = orderLinesTotal([latte(1, 2), latte(2, 1)]);
    const after = orderLinesTotal([latte(1, 2, [{ quantity: 1 }]), latte(2, 1)]);
    expect(before - after).toBe(2500);
  });

  it("the bill lists only what's still charged: a partly voided line at what's left", () => {
    const bill = buildEntryBill([round("COOKING", [latte(1, 2, [{ quantity: 1 }])])]);
    expect(bill.total).toBe(2500);
    expect(bill.acceptedRounds[0].lines[0].lineTotal).toBe(2500);
    // Latte ×1, + shot ×1 — no struck-through row, no "voided" label.
    expect(bill.acceptedRounds[0].lines[0].breakdown.map((row) => row.quantity)).toEqual([
      1, 1,
    ]);
  });

  it("leaves a line voided in full off the bill", () => {
    const bill = buildEntryBill([
      // A different note, so the two aren't merged into one display line.
      round("COOKING", [latte(1, 2, [{ quantity: 2 }]), { ...latte(2, 1), note: "hot" }]),
    ]);
    expect(bill.acceptedRounds[0].lines.map((line) => line.id)).toEqual([2]);
    expect(bill.total).toBe(2500);
  });

  it("leaves a round with nothing left off the bill", () => {
    const bill = buildEntryBill([round("COOKING", [latte(1, 2, [{ quantity: 2 }])])]);
    expect(bill.acceptedRounds).toEqual([]);
    expect(bill.total).toBe(0);
  });
});

describe("merged display lines keep their rows and voids", () => {
  it("lists every row's id and every void, so a void can act on the real rows", () => {
    const [merged] = mergeLinesForDisplay([
      { ...latte(1, 1, [{ quantity: 1 }]), contributorToken: "a" },
      { ...latte(2, 2), contributorToken: "b" },
    ]);
    expect(merged.orderIds).toEqual([1, 2]);
    expect(merged.quantity).toBe(3);
    expect(effectiveQuantity(merged)).toBe(2);
  });
});

describe("voidStaffName", () => {
  it("uses the staff member's name", () => {
    expect(voidStaffName({ name: "Aye", email: "aye@example.com" })).toBe("Aye");
  });

  it("falls back to the email when the name is missing or blank", () => {
    expect(voidStaffName({ name: null, email: "aye@example.com" })).toBe("aye@example.com");
    expect(voidStaffName({ name: "  ", email: "aye@example.com" })).toBe("aye@example.com");
  });

  it("is cut to the column's limit", () => {
    const long = "a".repeat(200);
    expect(voidStaffName({ name: long, email: "x@example.com" })).toHaveLength(
      VOID_STAFF_NAME_MAX_LENGTH,
    );
  });
});

describe("voidedByLabel", () => {
  it("shows the name frozen on the void, even if the linked user was renamed", () => {
    expect(
      voidedByLabel({ voidedByName: "Aye", voidedBy: { name: "Aye Aye", email: "a@example.com" } }),
    ).toBe("Aye");
  });

  it("keeps the frozen name after the user is removed", () => {
    expect(voidedByLabel({ voidedByName: "Aye", voidedBy: null })).toBe("Aye");
  });

  it("falls back to the linked user for voids made before the name was stored", () => {
    expect(voidedByLabel({ voidedByName: null, voidedBy: { name: null, email: "a@example.com" } })).toBe(
      "a@example.com",
    );
  });

  it("shows a dash when neither is known", () => {
    expect(voidedByLabel({ voidedByName: null, voidedBy: null })).toBe("—");
  });
});
