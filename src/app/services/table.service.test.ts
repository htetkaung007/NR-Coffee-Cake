import { beforeEach, describe, it, expect, vi } from "vitest";

// TableService's QR-image rules (CLAUDE.md Rule 7) with Prisma, storage
// and the QR drawing faked; every step is recorded in `events` so the
// tests check the ORDER.
const { events, state } = vi.hoisted(() => ({
  events: [] as string[],
  state: { failFileDelete: false, failDbWrite: false },
}));

const OLD_KEY = "table/5-1720000000000-0000000b.png";
const NEW_KEY = "table/5-1730000000000-0000000a.png";

vi.mock("@/app/utils/prisma", () => ({
  prisma: {
    table: {
      findFirst: async () => ({
        id: 5,
        locationId: 2,
        isCounter: false,
        counterAccessKey: "key",
        qrImageKey: OLD_KEY,
        location: { companyId: 1 },
      }),
      update: async ({ data }: { data: { qrImageKey?: string } }) => {
        if (state.failDbWrite) throw new Error("db down");
        events.push(`db:table.update ${data.qrImageKey}`);
      },
      delete: async () => {
        events.push("db:table.delete");
        return { id: 5, qrImageKey: OLD_KEY };
      },
    },
  },
}));

vi.mock("@/app/lib/storage/getFileStorageService", () => ({
  getFileStorageService: () => ({
    upload: async () => {
      events.push("file:upload");
      return { key: NEW_KEY };
    },
    delete: async (key: string) => {
      if (state.failFileDelete) throw new Error("disk error");
      events.push(`file:delete ${key}`);
    },
    open: async () => null,
  }),
}));

// The QR's text is built from the in-shop address (NEXTAUTH_URL).
vi.mock("@/app/utils/config", () => ({
  config: { mainUrl: "http://shop.local:3000" },
}));

vi.mock("@/app/lib/qr/qrCode", () => ({
  generateQrCodeWithLogo: async () => Buffer.from("png"),
}));

import { TableService } from "./table.service";

const table = {
  id: 5,
  locationId: 2,
  isCounter: false,
  counterAccessKey: "key",
  qrImageKey: OLD_KEY,
};
const scope = { role: "ADMIN" as const, companyId: 1, userId: 1, locationId: 2 };

beforeEach(() => {
  events.length = 0;
  Object.assign(state, { failFileDelete: false, failDbWrite: false });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("TableService.regenerateQrImage", () => {
  it("writes the new QR file, points the table at it, then deletes the old one", async () => {
    await TableService.regenerateQrImage(table, null);
    expect(events).toEqual([
      "file:upload",
      `db:table.update ${NEW_KEY}`,
      `file:delete ${OLD_KEY}`,
    ]);
  });

  it("still succeeds when the old file can't be deleted (logged, never thrown)", async () => {
    state.failFileDelete = true;
    await expect(TableService.regenerateQrImage(table, null)).resolves.toBe(NEW_KEY);
    expect(console.error).toHaveBeenCalled();
  });

  it("deletes the new file when the database write fails, and keeps the old one", async () => {
    state.failDbWrite = true;
    await expect(TableService.regenerateQrImage(table, null)).rejects.toThrow("db down");
    expect(events).toEqual(["file:upload", `file:delete ${NEW_KEY}`]);
  });

  it("has nothing old to delete for a brand-new table", async () => {
    await TableService.regenerateQrImage({ ...table, qrImageKey: null }, null);
    expect(events).toEqual(["file:upload", `db:table.update ${NEW_KEY}`]);
  });
});

describe("TableService.deleteTable", () => {
  it("deletes the row first, then its QR file", async () => {
    await TableService.deleteTable(5, scope);
    expect(events).toEqual(["db:table.delete", `file:delete ${OLD_KEY}`]);
  });

  it("still succeeds when the QR file can't be deleted (logged, never thrown)", async () => {
    state.failFileDelete = true;
    await expect(TableService.deleteTable(5, scope)).resolves.toBeDefined();
    expect(console.error).toHaveBeenCalled();
  });
});
