import { describe, it, expect, vi, beforeEach } from "vitest";

// A tiny in-memory MenuStock table standing in for the Prisma client, so
// setManualDisabled's upsert runs against real create/update semantics
// without a database (as in menuCategory.service.test.ts).
type Row = { menuId: number; locationId: number; quantity: number; isManuallyDisabled: boolean };
const rows: Row[] = [];
vi.mock("@/app/utils/prisma", () => ({
  prisma: {
    menuStock: {
      upsert: async (args: {
        where: { menuId_locationId: { menuId: number; locationId: number } };
        update: Partial<Row>;
        create: Pick<Row, "menuId" | "locationId"> & Partial<Row>;
      }) => {
        const { menuId, locationId } = args.where.menuId_locationId;
        const existing = rows.find(
          (row) => row.menuId === menuId && row.locationId === locationId,
        );
        if (existing) return Object.assign(existing, args.update);
        const created = { quantity: 0, isManuallyDisabled: false, ...args.create };
        rows.push(created);
        return created;
      },
    },
  },
}));

import { MenuStockService } from "./menuStock.service";

beforeEach(() => {
  rows.length = 0;
});

describe("MenuStockService.setManualDisabled", () => {
  it("creates the row with quantity 0 when the location has none yet", async () => {
    await MenuStockService.setManualDisabled(1, 10, true);
    expect(rows).toEqual([
      { menuId: 1, locationId: 10, quantity: 0, isManuallyDisabled: true },
    ]);
  });

  it("updates only the switch on an existing row, keeping its quantity", async () => {
    rows.push({ menuId: 1, locationId: 10, quantity: 7, isManuallyDisabled: false });
    await MenuStockService.setManualDisabled(1, 10, true);
    expect(rows).toEqual([
      { menuId: 1, locationId: 10, quantity: 7, isManuallyDisabled: true },
    ]);
  });

  it("is idempotent — setting the same value twice leaves the same result", async () => {
    rows.push({ menuId: 1, locationId: 10, quantity: 3, isManuallyDisabled: false });
    await MenuStockService.setManualDisabled(1, 10, true);
    await MenuStockService.setManualDisabled(1, 10, true);
    expect(rows).toEqual([
      { menuId: 1, locationId: 10, quantity: 3, isManuallyDisabled: true },
    ]);
  });

  it("touches only the given location's row", async () => {
    rows.push({ menuId: 1, locationId: 20, quantity: 5, isManuallyDisabled: false });
    await MenuStockService.setManualDisabled(1, 10, true);
    expect(rows.find((row) => row.locationId === 20)?.isManuallyDisabled).toBe(false);
  });
});
