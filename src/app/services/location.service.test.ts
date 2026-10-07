import { describe, it, expect, vi, beforeEach } from "vitest";

// A fake Prisma client that records every write in order, so the test
// can check the delete's sequence and that nothing is written when the
// rule refuses. The counts the rule reads are set per test.
const { counts, writes, removedImages, record } = vi.hoisted(() => {
  const writes: string[] = [];
  return {
    counts: { sessions: 0, bills: 0, managers: 0 },
    writes,
    removedImages: [] as string[],
    record: (name: string) => async () => {
      writes.push(name);
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
      findMany: async () => [{ id: 1, qrcodeImageUrl: "http://store/qr-1.png" }],
      deleteMany: record("table.deleteMany"),
    },
    ordersAddon: { deleteMany: record("ordersAddon.deleteMany") },
    order: { deleteMany: record("order.deleteMany") },
    menuStock: { deleteMany: record("menuStock.deleteMany") },
    disableLocationMenus: { deleteMany: record("disableLocationMenus.deleteMany") },
    disableLocationMenuCategories: {
      deleteMany: record("disableLocationMenuCategories.deleteMany"),
    },
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
    delete: async (url: string) => {
      removedImages.push(url);
    },
  }),
}));

import { LocationService } from "./location.service";

beforeEach(() => {
  Object.assign(counts, { sessions: 0, bills: 0, managers: 0 });
  writes.length = 0;
  removedImages.length = 0;
});

describe("LocationService.deleteLocation", () => {
  it("refuses a location with sales history and writes nothing", async () => {
    counts.bills = 1;
    await expect(LocationService.deleteLocation(5, 1)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: expect.stringContaining("sales history"),
    });
    expect(writes).toEqual([]);
  });

  it("refuses while managers are assigned and writes nothing", async () => {
    counts.managers = 1;
    await expect(LocationService.deleteLocation(5, 1)).rejects.toMatchObject({
      message: "Move or remove its managers first.",
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
      "selectedLocation.updateMany",
      "location.delete",
    ]);
  });

  it("removes the tables' QR images only after the database delete", async () => {
    await LocationService.deleteLocation(5, 1);
    expect(removedImages).toEqual(["http://store/qr-1.png"]);
  });
});
