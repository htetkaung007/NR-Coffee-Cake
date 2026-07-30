import { config } from "../../utils/config";
import type { FileStorageService } from "./FileStorageService";
import { S3CompatibleStorageService } from "./S3CompatibleStorageService";

/**
 * Single switch point (PROJECT_RULES.md Rule 12). Today STORAGE_PROVIDER
 * is unset/"s3", pointing at local MinIO. Moving to AWS S3 or DigitalOcean
 * Spaces later only means changing MINIO_ENDPOINT/MINIO_ACCESS_KEY/etc in
 * .env — no code here or in any caller needs to change, since all three
 * are S3-compatible.
 */
export function getFileStorageService(): FileStorageService {
  switch (config.storageProvider) {
    case "s3":
      return new S3CompatibleStorageService();
    default:
      throw new Error(`Unknown STORAGE_PROVIDER: ${config.storageProvider}`);
  }
}
