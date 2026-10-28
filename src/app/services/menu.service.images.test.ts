import { beforeEach, describe, it, expect, vi } from "vitest";
import type { MenuImageSlot } from "@/app/lib/menu/menuImageSlots";

// MenuService's photo rules (CLAUDE.md Rule 7) with Prisma, storage and
// the resize faked: every step is recorded in `events`, so the tests can
// check the ORDER — files written before the DB, removed files deleted
// only after the commit, nothing deleted on archive.
const { events, state } = vi.hoisted(() => ({
  events: [] as string[],
  state: {
    images: [] as { id: number; imageKey: string; position: number }[],
    orderCount: 0,
    uploads: 0,
    failUploadAt: -1,
    failDbWrite: false,
    failFileDelete: false,
    written: [] as { imageKey: string; position: number }[],
  },
}));

vi.mock("@/app/utils/prisma", () => {
  const tx = {
    menu: {
      findFirst: async () => ({ id: 7, name: "Latte" }),
      update: async () => {
        events.push("db:menu.archive");
      },
      delete: async () => {
        events.push("db:menu.delete");
      },
    },
    $queryRaw: async () => {
      events.push("db:lock menu");
    },
    order: { count: async () => state.orderCount },
    menuImage: {
      findMany: async () => state.images,
      deleteMany: async () => {
        events.push("db:menuImage.deleteMany");
      },
      createMany: async ({ data }: { data: { imageKey: string; position: number }[] }) => {
        if (state.failDbWrite) throw new Error("db down");
        state.written = data.map(({ imageKey, position }) => ({ imageKey, position }));
        events.push(`db:menuImage.createMany ${data.length}`);
      },
    },
    menuMenuCategory: { deleteMany: async () => {} },
    menuAddonCategories: { deleteMany: async () => {} },
    disableLocationMenus: { deleteMany: async () => {} },
    menuStock: { deleteMany: async () => {} },
    menuViewSeen: { deleteMany: async () => {} },
    menuViewDaily: { deleteMany: async () => {} },
  };
  return {
    prisma: {
      ...tx,
      $transaction: async (run: (client: typeof tx) => unknown) => {
        events.push("db:begin");
        const result = await run(tx);
        events.push("db:commit");
        return result;
      },
    },
  };
});

vi.mock("@/app/lib/storage/getFileStorageService", () => ({
  getFileStorageService: () => ({
    upload: async () => {
      const index = state.uploads++;
      if (index === state.failUploadAt) throw new Error("disk full");
      const key = `menu/7-173000000000${index}-0000000${index}.webp`;
      events.push(`file:upload ${key}`);
      return { key };
    },
    delete: async (key: string) => {
      if (state.failFileDelete) throw new Error("disk error");
      events.push(`file:delete ${key}`);
    },
    open: async () => null,
  }),
}));

vi.mock("@/app/lib/storage/cleanImageUpload", () => ({
  cleanImageUpload: async () => ({
    buffer: Buffer.from("webp"),
    contentType: "image/webp",
  }),
}));

import { MenuService } from "./menu.service";

const OLD = [
  { id: 41, imageKey: "menu/7-1700000000000-0000000a.webp", position: 0 },
  { id: 42, imageKey: "menu/7-1700000000001-0000000b.webp", position: 1 },
  { id: 43, imageKey: "menu/7-1700000000002-0000000c.webp", position: 2 },
];
const newKey = (index: number) => `menu/7-173000000000${index}-0000000${index}.webp`;
const keep = (imageId: number): MenuImageSlot => ({ kind: "keep", imageId });
const added = (fileIndex: number): MenuImageSlot => ({ kind: "new", fileIndex });
const photo = () => new File([Buffer.from("jpeg")], "latte.jpg", { type: "image/jpeg" });
const deletedFiles = () =>
  events.filter((event) => event.startsWith("file:delete ")).map((event) => event.slice(12));

beforeEach(() => {
  events.length = 0;
  Object.assign(state, {
    images: [],
    orderCount: 0,
    uploads: 0,
    failUploadAt: -1,
    failDbWrite: false,
    failFileDelete: false,
    written: [],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("MenuService.saveMenuImages", () => {
  it("writes new files first, then the rows (positions 0..n-1), and deletes nothing", async () => {
    await MenuService.saveMenuImages(7, 1, [added(0), added(1)], [photo(), photo()]);
    expect(events).toEqual([
      `file:upload ${newKey(0)}`,
      `file:upload ${newKey(1)}`,
      "db:begin",
      "db:lock menu",
      "db:menuImage.deleteMany",
      "db:menuImage.createMany 2",
      "db:commit",
    ]);
    expect(state.written).toEqual([
      { imageKey: newKey(0), position: 0 },
      { imageKey: newKey(1), position: 1 },
    ]);
  });

  it("refuses more than 3 photos before anything is written", async () => {
    state.images = OLD;
    await expect(
      MenuService.saveMenuImages(7, 1, [keep(41), keep(42), keep(43), added(0)], [photo()]),
    ).rejects.toMatchObject({ code: "MENU_IMAGES_TOO_MANY" });
    expect(events).toEqual([]);
  });

  it("reorders: positions continuous, no file uploaded or deleted", async () => {
    state.images = OLD;
    await MenuService.saveMenuImages(7, 1, [keep(43), keep(41), keep(42)], []);
    expect(state.written).toEqual([
      { imageKey: OLD[2].imageKey, position: 0 },
      { imageKey: OLD[0].imageKey, position: 1 },
      { imageKey: OLD[1].imageKey, position: 2 },
    ]);
    expect(events.some((event) => event.startsWith("file:"))).toBe(false);
  });

  it("removes a photo: its file is deleted only after the commit", async () => {
    state.images = OLD;
    await MenuService.saveMenuImages(7, 1, [keep(41), keep(43)], []);
    expect(deletedFiles()).toEqual([OLD[1].imageKey]);
    expect(events.indexOf(`file:delete ${OLD[1].imageKey}`)).toBeGreaterThan(
      events.indexOf("db:commit"),
    );
    expect(state.written.map((row) => row.position)).toEqual([0, 1]);
  });

  it("replaces a photo: new file → DB → old file deleted", async () => {
    state.images = OLD;
    await MenuService.saveMenuImages(7, 1, [added(0), keep(42), keep(43)], [photo()]);
    expect(events[0]).toBe(`file:upload ${newKey(0)}`);
    expect(events.at(-1)).toBe(`file:delete ${OLD[0].imageKey}`);
    expect(state.written[0]).toEqual({ imageKey: newKey(0), position: 0 });
  });

  it("writes nothing when the photos are the same, in the same order", async () => {
    state.images = OLD;
    await MenuService.saveMenuImages(7, 1, [keep(41), keep(42), keep(43)], []);
    expect(events).not.toContain("db:menuImage.deleteMany");
    expect(deletedFiles()).toEqual([]);
  });

  it("deletes the new files when the database write fails — no orphans — keeps the old ones, and fails", async () => {
    state.images = OLD;
    state.failDbWrite = true;
    await expect(
      MenuService.saveMenuImages(7, 1, [added(0), added(1)], [photo(), photo()]),
    ).rejects.toThrow("db down");
    expect(deletedFiles()).toEqual([newKey(0), newKey(1)]);
  });

  it("deletes the files already written when a later upload fails, and writes no row", async () => {
    state.failUploadAt = 2;
    await expect(
      MenuService.saveMenuImages(7, 1, [added(0), added(1), added(2)], [photo(), photo(), photo()]),
    ).rejects.toThrow("disk full");
    expect(deletedFiles()).toEqual([newKey(0), newKey(1)]);
    expect(events).not.toContain("db:begin");
  });

  it("refuses to keep another menu's photo — not found, the new file deleted", async () => {
    state.images = OLD;
    await expect(
      MenuService.saveMenuImages(7, 1, [keep(99), added(0)], [photo()]),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(events).not.toContain("db:menuImage.deleteMany");
    expect(deletedFiles()).toEqual([newKey(0)]);
  });

  it("still succeeds when a removed file can't be deleted (logged, never thrown)", async () => {
    state.images = OLD;
    state.failFileDelete = true;
    await expect(MenuService.saveMenuImages(7, 1, [], [])).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("MenuService.deleteMenu — its photos", () => {
  it("hard delete: removes the MenuImage rows in the transaction, then all 3 files after it", async () => {
    state.images = OLD;
    await MenuService.deleteMenu(7, 1);
    const commit = events.indexOf("db:commit");
    expect(events.indexOf("db:menuImage.deleteMany")).toBeLessThan(
      events.indexOf("db:menu.delete"),
    );
    expect(deletedFiles()).toEqual(OLD.map((image) => image.imageKey));
    for (const image of OLD) {
      expect(events.indexOf(`file:delete ${image.imageKey}`)).toBeGreaterThan(commit);
    }
  });

  it("archive (ordered before): keeps the photos — History and receipts still show them", async () => {
    state.orderCount = 3;
    state.images = OLD;
    await MenuService.deleteMenu(7, 1);
    expect(events).toContain("db:menu.archive");
    expect(events).not.toContain("db:menuImage.deleteMany");
    expect(deletedFiles()).toEqual([]);
  });
});
