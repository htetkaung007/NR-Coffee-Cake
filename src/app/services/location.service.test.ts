import { describe, it, expect, vi, beforeEach } from "vitest";

// A fake Prisma client that records every write in order, so the test
// can check the delete's sequence and that nothing is written when the
// rule refuses. The counts the rule reads are set per test.
const { counts, writes, viewDeletes, removedImages, record, recordViewDelete } =
  vi.hoisted(() => {
    const writes: string[] = [];
    const viewDeletes: { table: string; where: unknown }[] = [];
    return {
      counts: { sessions: 0, bills: 0, managers: 0 },
      writes,
      viewDeletes,
      removedImages: [] as string[],
      record: (name: string) => async () => {
        writes.push(name);
        return { count: 1 };
      },
      recordViewDelete:
        (table: string) =>
        async ({ where }: { where: unknown }) => {
          writes.push(`${table}.deleteMany`);
          viewDeletes.push({ table, where });
          return { count: 1 };
        },
    };
  });

vi.mock("@/app/utils/prisma", () => {
  const tx = {
    location: {
      findFirst: async ({ where }: { where: { id: number | { not: number } } }) =>
        typeof where.id === "number" ? { id: where.id } : { id: 99 },
      delete: record("location.delete"),
    },
    orderSession: { count: async () => counts.sessions },
    bill: { count: async () => counts.bills },
    user: { count: async () => counts.managers },
    table: {
      findMany: async () => [
        { id: 1, qrImageKey: "table/1-1730000000000-0000000a.png" },
        { id: 2, qrImageKey: null },
      ],
      deleteMany: record("table.deleteMany"),
    },
    ordersAddon: { deleteMany: record("ordersAddon.deleteMany") },
    order: { deleteMany: record("order.deleteMany") },
    menuStock: { deleteMany: record("menuStock.deleteMany") },
    disableLocationMenus: { deleteMany: record("disableLocationMenus.deleteMany") },
    disableLocationMenuCategories: {
      deleteMany: record("disableLocationMenuCategories.deleteMany"),
    },
    menuViewDaily: { deleteMany: recordViewDelete("menuViewDaily") },
    menuViewSeen: { deleteMany: recordViewDelete("menuViewSeen") },
    selectedLocation: {
      updateMany: record("selectedLocation.updateMany"),
      deleteMany: record("selectedLocation.deleteMany"),
    },
  };
  return {
    prisma: { ...tx, $transaction: (run: (client: typeof tx) => unknown) => run(tx) },
  };
});
vi.mock("@/app/lib/storage/getFileStorageService", () => ({
  getFileStorageService: () => ({
    delete: async (key: string) => {
      removedImages.push(key);
    },
  }),
}));

import { LocationService } from "./location.service";

beforeEach(() => {
  Object.assign(counts, { sessions: 0, bills: 0, managers: 0 });
  writes.length = 0;
  viewDeletes.length = 0;
  removedImages.length = 0;
});

describe("LocationService.deleteLocation", () => {
  it("refuses a location with sales history and writes nothing", async () => {
    counts.bills = 1;
    await expect(LocationService.deleteLocation(5, 1)).rejects.toMatchObject({
      // Its own code, so a Myanmar staff screen can say it in Myanmar.
      code: "LOCATION_HAS_SALES",
      message: expect.stringContaining("sales history"),
    });
    expect(writes).toEqual([]);
  });

  it("refuses while managers are assigned and writes nothing", async () => {
    counts.managers = 1;
    await expect(LocationService.deleteLocation(5, 1)).rejects.toMatchObject({
      message: "Move or remove its managers in Settings first.",
    });
    expect(writes).toEqual([]);
  });

  it("removes the setup rows, moves selected locations, then the location — in that order", async () => {
    await LocationService.deleteLocation(5, 1);
    expect(writes).toEqual([
      "ordersAddon.deleteMany",
      "order.deleteMany",
      "table.deleteMany",
      "menuStock.deleteMany",
      "disableLocationMenus.deleteMany",
      "disableLocationMenuCategories.deleteMany",
      "menuViewDaily.deleteMany",
      "menuViewSeen.deleteMany",
      "selectedLocation.updateMany",
      "location.delete",
    ]);
  });

  it("removes the location's menu-view rows by locationId (MenuViewDaily's FK would block the delete)", async () => {
    await LocationService.deleteLocation(5, 1);
    expect(viewDeletes).toEqual([
      { table: "menuViewDaily", where: { locationId: 5 } },
      { table: "menuViewSeen", where: { locationId: 5 } },
    ]);
  });

  it("removes the tables' QR images only after the database delete", async () => {
    await LocationService.deleteLocation(5, 1);
    expect(removedImages).toEqual(["table/1-1730000000000-0000000a.png"]);
  });
});
