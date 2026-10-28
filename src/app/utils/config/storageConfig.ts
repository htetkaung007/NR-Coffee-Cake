import path from "node:path";

/**
 * Where uploaded files live (CLAUDE.md §12), checked once at server
 * startup (src/instrumentation.ts) so a bad value stops the server with a
 * clear message instead of failing on the first upload. Pure: the
 * environment and NODE_ENV come in as arguments.
 *
 * - STORAGE_PROVIDER: "local" (default — files under UPLOAD_DIR) or "s3"
 *   (MinIO / AWS S3 / Spaces — the path back to the cloud).
 * - UPLOAD_DIR: the local provider's root (the s3 provider ignores it).
 *   Development: defaults to ./.uploads in the repo. Production: required
 *   and absolute — a relative path would depend on where `npm start` ran.
 * - MINIO_*: required only when STORAGE_PROVIDER=s3.
 */

const PROVIDERS = ["local", "s3"] as const;
type StorageProvider = (typeof PROVIDERS)[number];

export interface S3Settings {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
}

/** `uploadDir` is absolute, resolved once here. The s3 settings come
 *  only (and always) with the "s3" provider. */
export type StorageConfig =
  | { provider: "local"; uploadDir: string; s3: null }
  | { provider: "s3"; uploadDir: string; s3: S3Settings };

const DEV_UPLOAD_DIR = ".uploads";

const S3_SETTINGS = [
  ["MINIO_ENDPOINT", "endpoint"],
  ["MINIO_ACCESS_KEY", "accessKey"],
  ["MINIO_SECRET_KEY", "secretKey"],
  ["MINIO_BUCKET", "bucket"],
] as const;

type Env = Record<string, string | undefined>;

function parseProvider(value: string | undefined): StorageProvider {
  const provider = value || "local";
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error(
      `STORAGE_PROVIDER is "${provider}" — it must be one of: ${PROVIDERS.join(", ")}.`,
    );
  }
  return provider as StorageProvider;
}

/** Resolved against the working directory at RUN time. The ignore
 *  comment tells Next's build not to treat this path as a file the app
 *  ships (it would otherwise trace the whole project). */
function resolveDir(dir: string) {
  return path.resolve(/*turbopackIgnore: true*/ process.cwd(), dir);
}

function parseUploadDir(value: string | undefined, nodeEnv: string | undefined) {
  if (nodeEnv !== "production") return resolveDir(value || DEV_UPLOAD_DIR);
  if (!value) {
    throw new Error(
      "UPLOAD_DIR is required in production — the absolute folder uploaded images are kept in.",
    );
  }
  if (!path.isAbsolute(value)) {
    throw new Error(`UPLOAD_DIR must be an absolute path in production (got "${value}").`);
  }
  return resolveDir(value);
}

function parseS3(env: Env): S3Settings {
  const missing = S3_SETTINGS.filter(([name]) => !env[name]).map(([name]) => name);
  if (missing.length > 0) {
    throw new Error(
      `STORAGE_PROVIDER is "s3" but these are not set: ${missing.join(", ")}.`,
    );
  }
  return {
    endpoint: env.MINIO_ENDPOINT as string,
    accessKey: env.MINIO_ACCESS_KEY as string,
    secretKey: env.MINIO_SECRET_KEY as string,
    bucket: env.MINIO_BUCKET as string,
  };
}

/** The storage settings from `env`, or an Error saying exactly what's
 *  wrong. */
export function parseStorageConfig(
  env: Env,
  nodeEnv: string | undefined,
): StorageConfig {
  const provider = parseProvider(env.STORAGE_PROVIDER);
  const uploadDir = parseUploadDir(env.UPLOAD_DIR, nodeEnv);
  return provider === "s3"
    ? { provider, uploadDir, s3: parseS3(env) }
    : { provider, uploadDir, s3: null };
}
