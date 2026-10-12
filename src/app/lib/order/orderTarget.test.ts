import { describe, it, expect } from "vitest";
import {
  CLOSED_LINK_NOTICE,
  orderTargetSchema,
  parseTargetKey,
  resolveTarget,
  targetFromLink,
  targetKey,
  type OrderTarget,
} from "./orderTarget";

const options = {
  hasCounter: true,
  tableIds: [3, 5],
  openBillRootIds: [12],
};

describe("targetKey / parseTargetKey", () => {
  it("names a bill and a table by their Order List entry key", () => {
    expect(targetKey({ kind: "counterBill", billRootId: 12 })).toBe("counter-12");
    expect(targetKey({ kind: "table", tableId: 3 })).toBe("table-3");
    expect(targetKey({ kind: "counterNew" })).toBe("counter-new");
  });

  it("reads every target back from its key", () => {
    const targets: OrderTarget[] = [
      { kind: "counterNew" },
      { kind: "counterBill", billRootId: 12 },
      { kind: "table", tableId: 3 },
    ];
    for (const target of targets) {
      expect(parseTargetKey(targetKey(target))).toEqual(target);
    }
  });

  it("refuses anything else — junk, zero, negative or padded ids", () => {
    for (const key of ["", "counter-", "table-0", "table--3", "table-03", "bill-12", "table-3x", null]) {
      expect(parseTargetKey(key)).toBeNull();
    }
  });
});

describe("resolveTarget", () => {
  it("keeps a target that can still be ordered for", () => {
    expect(resolveTarget({ kind: "counterBill", billRootId: 12 }, options)).toEqual({
      kind: "counterBill",
      billRootId: 12,
    });
    expect(resolveTarget({ kind: "table", tableId: 5 }, options)).toEqual({
      kind: "table",
      tableId: 5,
    });
  });

  it("drops a bill that's no longer open (paid, cancelled)", () => {
    expect(resolveTarget({ kind: "counterBill", billRootId: 99 }, options)).toBeNull();
  });

  it("drops a table that's gone", () => {
    expect(resolveTarget({ kind: "table", tableId: 9 }, options)).toBeNull();
  });

  it("drops a new takeaway where there's no counter", () => {
    expect(
      resolveTarget({ kind: "counterNew" }, { ...options, hasCounter: false }),
    ).toBeNull();
  });
});

describe("targetFromLink — New Order opened from an order's Add items", () => {
  it("preselects that order when it's still open", () => {
    expect(targetFromLink("counter-12", options)).toEqual({
      target: { kind: "counterBill", billRootId: 12 },
      notice: null,
    });
  });

  it("falls back to a new takeaway, with a notice, for a closed or unknown order", () => {
    for (const key of ["counter-99", "table-9", "nonsense"]) {
      expect(targetFromLink(key, options)).toEqual({
        target: { kind: "counterNew" },
        notice: CLOSED_LINK_NOTICE,
      });
    }
  });

  it("does nothing without a link", () => {
    expect(targetFromLink(null, options)).toBeNull();
  });
});

describe("orderTargetSchema", () => {
  it("accepts each kind and refuses a bad id or kind", () => {
    expect(orderTargetSchema.safeParse({ kind: "counterBill", billRootId: 12 }).success).toBe(true);
    expect(orderTargetSchema.safeParse({ kind: "table", tableId: 0 }).success).toBe(false);
    expect(orderTargetSchema.safeParse({ kind: "bill", id: 3 }).success).toBe(false);
  });
});
