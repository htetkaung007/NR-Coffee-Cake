import type { AssetFolder } from "./assetKey";

/** A stored file opened for reading — streamed, never read whole into
 *  memory. */
export interface StoredFile {
  body: ReadableStream<Uint8Array>;
  /** Bytes — the route's Content-Length. */
  size: number;
}

/**
 * Where uploaded images live (CLAUDE.md §12) — swappable:
 * LocalFileStorageService ("local", the default — files under
 * UPLOAD_DIR) or S3CompatibleStorageService ("s3", the path back to the
 * cloud). Everything outside lib/storage speaks KEYS only (lib/storage/
 * assetKey): the database stores the key, the browser loads
 * /assets/<key>.
 */
export interface FileStorageService {
  /** Stores `file` under a NEW key for entity `id` in `folder` ("menu" →
   *  .webp, "table" → .png) and returns that key. Never overwrites. */
  upload(file: Buffer, folder: AssetFolder, id: number): Promise<{ key: string }>;

  /** Removes the file at `key`. A key that's already gone is fine. */
  delete(key: string): Promise<void>;

  /** The file at `key` for the /assets route, or null when there's none
   *  (or the key would reach outside the store). Needed because the route
   *  streams for both providers — a local file or an S3 GetObject — and
   *  must not know which one it's talking to. */
  open(key: string): Promise<StoredFile | null>;
}
