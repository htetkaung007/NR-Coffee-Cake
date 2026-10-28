/**
 * Runs once when the server starts (`next dev` / `next start` — never
 * during `next build`). Checks the storage settings (STORAGE_PROVIDER,
 * UPLOAD_DIR, MINIO_* for s3 — utils/config/storageConfig) so a bad
 * value stops the server at once with a clear message, instead of
 * failing on the first upload or image (utils/config/checkStorageAtStartup).
 *
 * NEXT_RUNTIME is read here directly (CLAUDE.md §12's exceptions): it's
 * Next's own variable saying which runtime is loading this file; the
 * check (node:path, process.exit) is imported in the Node.js one only.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkStorageAtStartup } = await import(
    "./app/utils/config/checkStorageAtStartup"
  );
  checkStorageAtStartup();
}
