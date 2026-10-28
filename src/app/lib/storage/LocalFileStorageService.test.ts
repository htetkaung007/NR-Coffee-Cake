import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it, expect } from "vitest";
import { isAssetKey } from "./assetKey";
import { LocalFileStorageService } from "./LocalFileStorageService";

// The contract test (CLAUDE.md §16's named exception): a real temp
// folder per test, removed afterwards — never the real UPLOAD_DIR.
let root: string;
let storage: LocalFileStorageService;

beforeEach(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "cafe-storage-"));
  storage = new LocalFileStorageService(root);
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

const bytes = Buffer.from("not really a webp, the storage doesn't care");

async function readAll(stream: ReadableStream<Uint8Array>) {
  return Buffer.from(await new Response(stream).arrayBuffer());
}

describe("LocalFileStorageService", () => {
  it("uploads to a key of our shape, the file under that key holding the bytes", async () => {
    const { key } = await storage.upload(bytes, "menu", 12);
    expect(isAssetKey(key)).toBe(true);
    expect(key.startsWith("menu/12-")).toBe(true);
    expect(await readFile(path.join(root, key))).toEqual(bytes);
  });

  it("creates the folder on the first upload", async () => {
    const { key } = await storage.upload(bytes, "table", 5);
    expect((await stat(path.join(root, "table"))).isDirectory()).toBe(true);
    expect(key.endsWith(".png")).toBe(true);
  });

  it("leaves no temp file behind", async () => {
    await storage.upload(bytes, "menu", 1);
    expect(await readdir(path.join(root, "menu"))).toHaveLength(1);
  });

  it("gives two uploads in a row two keys, both kept", async () => {
    const first = await storage.upload(bytes, "menu", 1);
    const second = await storage.upload(Buffer.from("other"), "menu", 1);
    expect(first.key).not.toBe(second.key);
    expect(await readdir(path.join(root, "menu"))).toHaveLength(2);
  });

  it("deletes the file at a key", async () => {
    const { key } = await storage.upload(bytes, "menu", 3);
    await storage.delete(key);
    await expect(stat(path.join(root, key))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("treats deleting a file that's already gone as done", async () => {
    await expect(
      storage.delete("menu/3-1730000000000-a1b2c3d4.webp"),
    ).resolves.toBeUndefined();
  });

  it("never deletes outside its root", async () => {
    const outside = path.join(root, "..", `outside-${path.basename(root)}.txt`);
    await writeFile(outside, "keep me");
    try {
      await storage.delete(`../${path.basename(outside)}`);
      expect(await readFile(outside, "utf8")).toBe("keep me");
    } finally {
      await rm(outside, { force: true });
    }
  });

  it("opens a stored file as a stream with its size", async () => {
    const { key } = await storage.upload(bytes, "menu", 4);
    const file = await storage.open(key);
    expect(file?.size).toBe(bytes.length);
    expect(await readAll(file!.body)).toEqual(bytes);
  });

  it("opens a missing key as null", async () => {
    expect(
      await storage.open("menu/4-1730000000000-a1b2c3d4.webp"),
    ).toBeNull();
  });

  it("opens nothing outside its root", async () => {
    expect(await storage.open("../../etc/passwd")).toBeNull();
  });
});
