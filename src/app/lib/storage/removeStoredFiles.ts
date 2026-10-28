import type { FileStorageService } from "./FileStorageService";

/**
 * Deletes stored files AFTER the database stopped pointing at them
 * (CLAUDE.md Rule 7 — storage can't roll back with a transaction). Best
 * effort: a failed delete is logged with `label` (who asked) and never
 * thrown — the DB change already succeeded, and a leftover file is
 * harmless (nothing points at it), while a thrown error would report a
 * save that worked as failed. null / "" (no image) is skipped.
 */
export async function removeStoredFiles(
  storage: FileStorageService,
  keys: readonly (string | null)[],
  label: string,
): Promise<void> {
  await Promise.all(
    keys
      .filter((key): key is string => Boolean(key))
      .map((key) =>
        storage.delete(key).catch((error: unknown) => {
          console.error(`[${label}] Stored file not removed:`, key, error);
        }),
      ),
  );
}
