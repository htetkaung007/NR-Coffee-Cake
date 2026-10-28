import { createReadStream } from "node:fs";
import { mkdir, rename, rm, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { buildAssetKey, type AssetFolder } from "./assetKey";
import type { FileStorageService, StoredFile } from "./FileStorageService";

/**
 * Files on this machine's disk, under `root` (UPLOAD_DIR) — the default
 * provider: the shop runs offline on its LAN, so no object store is
 * needed. The key is the path below the root ("menu/12-…-a1b2c3d4.webp").
 */
export class LocalFileStorageService implements FileStorageService {
  constructor(private readonly root: string) {}

  /** The absolute path for `key`, or null when it would land outside the
   *  root ("../", an absolute key) — the last guard behind the /assets
   *  route's key allowlist. */
  private pathFor(key: string): string | null {
    const full = path.resolve(this.root, key);
    const relative = path.relative(this.root, full);
    if (relative === "" || relative.startsWith("..") || path.isAbsolute(relative)) {
      return null;
    }
    return full;
  }

  /** Written to a temp file in the same folder, then renamed into place
   *  — a rename within one folder is atomic, so a reader (or a crash)
   *  never sees half a file under the real key. */
  async upload(file: Buffer, folder: AssetFolder, id: number) {
    const key = buildAssetKey(folder, id);
    const target = this.pathFor(key) as string; // built by us — always inside
    await mkdir(path.dirname(target), { recursive: true });
    const temp = `${target}.${process.pid}-${Date.now()}.tmp`;
    try {
      await writeFile(temp, file, { flag: "wx" });
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true });
      throw error;
    }
    return { key };
  }

  async delete(key: string) {
    const target = this.pathFor(key);
    if (target === null) return;
    try {
      await unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async open(key: string): Promise<StoredFile | null> {
    const target = this.pathFor(key);
    if (target === null) return null;
    try {
      const info = await stat(target);
      if (!info.isFile()) return null;
      const body = Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>;
      return { body, size: info.size };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }
}
