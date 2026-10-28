import { config } from "../../utils/config";
import type { FileStorageService } from "./FileStorageService";
import { LocalFileStorageService } from "./LocalFileStorageService";
import { S3CompatibleStorageService } from "./S3CompatibleStorageService";

/**
 * The single switch point (CLAUDE.md §12): STORAGE_PROVIDER picks the
 * provider — "local" (default, files under UPLOAD_DIR) or "s3". The
 * settings were checked at startup (utils/config/storageConfig,
 * src/instrumentation.ts), so nothing here can be missing.
 */
export function getFileStorageService(): FileStorageService {
  const storage = config.storage;
  switch (storage.provider) {
    case "local":
      return new LocalFileStorageService(storage.uploadDir);
    case "s3":
      return new S3CompatibleStorageService(storage.s3);
  }
}
