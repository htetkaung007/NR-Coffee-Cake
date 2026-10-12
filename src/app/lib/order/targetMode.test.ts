import { describe, it, expect } from "vitest";
import {
  modeOfTarget,
  openBillCount,
  optionsForMode,
  type ModeSource,
} from "./targetMode";

const source: ModeSource = {
  hasCounter: true,
  tables: [
    { id: 3, status: "inUse" },
    { id: 5, status: "free" },
    { id: 7, status: "free" },
  ],
  counterBillRootIds: [12],
};

describe("optionsForMode", () => {
  it("New order: a new takeaway and the free tables only", () => {
    expect(optionsForMode("new", source)).toEqual({
      counterNew: true,
      counterBillRootIds: [],
      tableIds: [5, 7],
    });
  });

  it("Add to open bill: the open counter bills and the in-use tables only", () => {
    expect(optionsForMode("open", source)).toEqual({
      counterNew: false,
      counterBillRootIds: [12],
      tableIds: [3],
    });
  });

  it("offers no new takeaway where there's no counter", () => {
    expect(optionsForMode("new", { ...source, hasCounter: false }).counterNew).toBe(false);
  });

  it("New order has no tables when all are in use", () => {
    const allInUse = { ...source, tables: [{ id: 3, status: "inUse" as const }] };
    expect(optionsForMode("new", allInUse).tableIds).toEqual([]);
  });
});

describe("modeOfTarget", () => {
  it("puts a new takeaway in New order and an open bill in Add to open bill", () => {
    expect(modeOfTarget({ kind: "counterNew" }, source)).toBe("new");
    expect(modeOfTarget({ kind: "counterBill", billRootId: 12 }, source)).toBe("open");
  });

  it("puts a table where its occupancy is now — so the toggle follows it", () => {
    expect(modeOfTarget({ kind: "table", tableId: 5 }, source)).toBe("new");
    expect(modeOfTarget({ kind: "table", tableId: 3 }, source)).toBe("open");
  });

  it("counts a table it doesn't know as free", () => {
    expect(modeOfTarget({ kind: "table", tableId: 99 }, source)).toBe("new");
  });
});

describe("openBillCount", () => {
  it("counts open counter bills and in-use tables", () => {
    expect(openBillCount(source)).toBe(2);
  });

  it("is 0 when nothing is open", () => {
    expect(
      openBillCount({ ...source, tables: [{ id: 5, status: "free" }], counterBillRootIds: [] }),
    ).toBe(0);
  });
});
