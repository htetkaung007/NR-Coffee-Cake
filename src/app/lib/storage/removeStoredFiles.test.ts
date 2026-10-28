import { afterEach, describe, it, expect, vi } from "vitest";
import type { FileStorageService } from "./FileStorageService";
import { removeStoredFiles } from "./removeStoredFiles";

function fakeStorage(failing: readonly string[] = []) {
  const deleted: string[] = [];
  const storage: FileStorageService = {
    upload: vi.fn(),
    open: vi.fn(),
    delete: async (key) => {
      if (failing.includes(key)) throw new Error(`disk error on ${key}`);
      deleted.push(key);
    },
  };
  return { storage, deleted };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("removeStoredFiles", () => {
  it("deletes every key", async () => {
    const { storage, deleted } = fakeStorage();
    await removeStoredFiles(storage, ["menu/a", "menu/b"], "test");
    expect(deleted).toEqual(["menu/a", "menu/b"]);
  });

  it("skips empty keys (no image)", async () => {
    const { storage, deleted } = fakeStorage();
    await removeStoredFiles(storage, [null, "", "menu/a"], "test");
    expect(deleted).toEqual(["menu/a"]);
  });

  it("logs a failed delete, still deletes the others and never throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { storage, deleted } = fakeStorage(["menu/a"]);
    await expect(
      removeStoredFiles(storage, ["menu/a", "menu/b"], "MenuService.deleteMenu"),
    ).resolves.toBeUndefined();
    expect(deleted).toEqual(["menu/b"]);
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0][0])).toContain("MenuService.deleteMenu");
  });
});
