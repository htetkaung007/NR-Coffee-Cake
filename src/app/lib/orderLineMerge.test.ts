import { describe, it, expect } from "vitest";
import {
  groupDraftsForSubmit,
  lineMergeKey,
  mergeLinesForDisplay,
} from "./orderLineMerge";
import { orderLinesTotal } from "./orderTotals";

const extraShot = { addonId: 1, unitPrice: 500 };
const oatMilk = { addonId: 2, unitPrice: 700 };

describe("lineMergeKey", () => {
  it("treats the same add-ons picked in a different order as the same line", () => {
    expect(lineMergeKey(10, 2000, [extraShot, oatMilk], null)).toBe(
      lineMergeKey(10, 2000, [oatMilk, extraShot], null),
    );
  });

  it("counts a duplicated add-on the same as picking it once", () => {
    expect(lineMergeKey(10, 2000, [extraShot, extraShot], null)).toBe(
      lineMergeKey(10, 2000, [extraShot], null),
    );
  });

  it("ignores letter case and repeated spaces in the note", () => {
    expect(lineMergeKey(10, 2000, [], "Extra hot")).toBe(
      lineMergeKey(10, 2000, [], "extra  hot"),
    );
  });

  it("treats a null, empty or whitespace-only note as no note", () => {
    const noNote = lineMergeKey(10, 2000, [], null);
    expect(lineMergeKey(10, 2000, [], "")).toBe(noNote);
    expect(lineMergeKey(10, 2000, [], "   ")).toBe(noNote);
    expect(lineMergeKey(10, 2000, [], undefined)).toBe(noNote);
  });

  it("keeps notes with different words apart", () => {
    expect(lineMergeKey(10, 2000, [], "less sugar")).not.toBe(
      lineMergeKey(10, 2000, [], "no sugar"),
    );
  });

  it("keeps a line with a note apart from one without", () => {
    expect(lineMergeKey(10, 2000, [], "less sugar")).not.toBe(
      lineMergeKey(10, 2000, [], null),
    );
  });

  it("keeps the same menu at different unit prices apart", () => {
    expect(lineMergeKey(10, 2000, [], null)).not.toBe(
      lineMergeKey(10, 2500, [], null),
    );
  });

  it("keeps the same add-on at different unit prices apart", () => {
    expect(lineMergeKey(10, 2000, [extraShot], null)).not.toBe(
      lineMergeKey(10, 2000, [{ addonId: 1, unitPrice: 600 }], null),
    );
  });

  it("keeps different add-on sets apart", () => {
    expect(lineMergeKey(10, 2000, [extraShot], null)).not.toBe(
      lineMergeKey(10, 2000, [extraShot, oatMilk], null),
    );
  });

  it("keeps different menus apart", () => {
    expect(lineMergeKey(10, 2000, [], null)).not.toBe(
      lineMergeKey(11, 2000, [], null),
    );
  });
});

/** A Table draft row as submitDraft reads it. */
const draft = (
  contributorToken: string | null,
  menuId: number,
  quantity: number,
  overrides: Partial<{
    menuName: string;
    unitPrice: number;
    addons: { addonId: number; unitPrice: number }[];
    note: string | null;
  }> = {},
) => ({
  contributorToken,
  menuId,
  menuName: overrides.menuName ?? `Menu ${menuId}`,
  quantity,
  unitPrice: overrides.unitPrice ?? 2000,
  addons: overrides.addons ?? [],
  note: overrides.note ?? null,
});

describe("groupDraftsForSubmit", () => {
  it("keeps two customers' identical picks as two lines, each with its own token", () => {
    const { lines } = groupDraftsForSubmit([draft("a", 1, 1), draft("b", 1, 1)]);
    expect(lines.map((line) => [line.contributorToken, line.quantity])).toEqual([
      ["a", 1],
      ["b", 1],
    ]);
  });

  it("merges one customer's identical picks into one line with the quantities added", () => {
    const { lines } = groupDraftsForSubmit([draft("a", 1, 1), draft("a", 1, 2)]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ contributorToken: "a", menuId: 1, quantity: 3 });
  });

  it("keeps one customer's picks apart when the note, add-ons or price differ", () => {
    const { lines } = groupDraftsForSubmit([
      draft("a", 1, 1),
      draft("a", 1, 1, { note: "no sugar" }),
      draft("a", 1, 1, { addons: [{ addonId: 9, unitPrice: 500 }] }),
      draft("a", 1, 1, { unitPrice: 2500 }),
    ]);
    expect(lines).toHaveLength(4);
  });

  it("takes stock once per menu, with everyone's quantities combined", () => {
    const { stockByMenu } = groupDraftsForSubmit([
      draft("a", 1, 1, { menuName: "Latte" }),
      draft("b", 1, 2, { menuName: "Latte" }),
      draft("a", 1, 1, { menuName: "Latte", note: "hot" }),
      draft("b", 2, 1, { menuName: "Cake" }),
    ]);
    expect(stockByMenu).toEqual([
      { menuId: 1, menuName: "Latte", quantity: 4 },
      { menuId: 2, menuName: "Cake", quantity: 1 },
    ]);
  });

  it("keeps a merged line's note as first typed, and sorts its add-ons", () => {
    const { lines } = groupDraftsForSubmit([
      draft("a", 1, 1, {
        note: "  No Sugar ",
        addons: [
          { addonId: 9, unitPrice: 500 },
          { addonId: 3, unitPrice: 300 },
        ],
      }),
      draft("a", 1, 1, {
        note: "no sugar",
        addons: [
          { addonId: 3, unitPrice: 300 },
          { addonId: 9, unitPrice: 500 },
        ],
      }),
    ]);
    expect(lines).toHaveLength(1);
    expect(lines[0].note).toBe("No Sugar");
    expect(lines[0].addons.map((addon) => addon.addonId)).toEqual([3, 9]);
  });

  it("treats lines without a token as one person (rows from before tokens were kept)", () => {
    const { lines } = groupDraftsForSubmit([draft(null, 1, 1), draft(null, 1, 1)]);
    expect(lines).toEqual([expect.objectContaining({ contributorToken: null, quantity: 2 })]);
  });
});

/** A submitted Order row as the Backoffice reads it. */
const orderRow = (
  id: number,
  contributorToken: string | null,
  overrides: Partial<{
    menuId: number;
    quantity: number;
    unitPrice: number;
    note: string | null;
    OrdersAddons: { addonId: number; unitPrice: number }[];
  }> = {},
) => ({
  id,
  contributorToken,
  menuId: overrides.menuId ?? 1,
  quantity: overrides.quantity ?? 1,
  unitPrice: overrides.unitPrice ?? 2000,
  note: overrides.note ?? null,
  OrdersAddons: overrides.OrdersAddons ?? [],
});

describe("mergeLinesForDisplay", () => {
  it("merges identical lines from different customers, adding the quantities", () => {
    const merged = mergeLinesForDisplay([
      orderRow(10, "a", { quantity: 1 }),
      orderRow(11, "b", { quantity: 2 }),
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: 10, menuId: 1, quantity: 3 });
  });

  it("keeps lines with a different note, add-on set or price apart", () => {
    const merged = mergeLinesForDisplay([
      orderRow(1, "a"),
      orderRow(2, "b", { note: "no sugar" }),
      orderRow(3, "b", { OrdersAddons: [{ addonId: 9, unitPrice: 500 }] }),
      orderRow(4, "c", { unitPrice: 2500 }),
    ]);
    expect(merged.map((line) => line.id)).toEqual([1, 2, 3, 4]);
  });

  it("keeps the total exactly the same", () => {
    const lines = [
      orderRow(1, "a", { quantity: 2, OrdersAddons: [{ addonId: 9, unitPrice: 500 }] }),
      orderRow(2, "b", { quantity: 1, OrdersAddons: [{ addonId: 9, unitPrice: 500 }] }),
      orderRow(3, "a", { menuId: 2, unitPrice: 1500 }),
      orderRow(4, null, { note: "hot" }),
    ];
    expect(orderLinesTotal(mergeLinesForDisplay(lines))).toBe(orderLinesTotal(lines));
  });

  it("lists merged lines in order of first appearance, keeping the first's id, add-ons and note", () => {
    const merged = mergeLinesForDisplay([
      orderRow(5, "a", { menuId: 2 }),
      orderRow(6, "b", { note: "Less Ice" }),
      orderRow(7, "c", { menuId: 2 }),
      orderRow(8, "d", { note: "less ice" }),
    ]);
    expect(merged.map((line) => [line.id, line.quantity, line.note])).toEqual([
      [5, 2, null],
      [6, 2, "Less Ice"],
    ]);
  });

  it("never carries a contributorToken", () => {
    const merged = mergeLinesForDisplay([orderRow(1, "secret"), orderRow(2, "other")]);
    for (const line of merged) {
      expect(Object.keys(line)).not.toContain("contributorToken");
    }
  });

  it("doesn't change the lines it was given", () => {
    const lines = [orderRow(1, "a"), orderRow(2, "b")];
    mergeLinesForDisplay(lines);
    expect(lines.map((line) => line.quantity)).toEqual([1, 1]);
  });
});
