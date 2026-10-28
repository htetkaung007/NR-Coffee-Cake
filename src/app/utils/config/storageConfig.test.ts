import path from "node:path";
import { describe, it, expect } from "vitest";
import { parseStorageConfig } from "./storageConfig";

const MINIO = {
  MINIO_ENDPOINT: "http://minio:9000",
  MINIO_ACCESS_KEY: "access",
  MINIO_SECRET_KEY: "secret",
  MINIO_BUCKET: "cafe-images",
};

describe("parseStorageConfig", () => {
  it("defaults to the local provider", () => {
    expect(parseStorageConfig({}, "development").provider).toBe("local");
  });

  it("puts uploads in ./.uploads during development, resolved to an absolute path", () => {
    const storage = parseStorageConfig({}, "development");
    expect(storage.uploadDir).toBe(path.resolve(".uploads"));
  });

  it("resolves a relative UPLOAD_DIR once, in development", () => {
    const storage = parseStorageConfig({ UPLOAD_DIR: "tmp/files" }, "development");
    expect(storage.uploadDir).toBe(path.resolve("tmp/files"));
  });

  it("requires UPLOAD_DIR in production", () => {
    expect(() => parseStorageConfig({}, "production")).toThrow(/UPLOAD_DIR/);
  });

  it("requires an absolute UPLOAD_DIR in production", () => {
    expect(() =>
      parseStorageConfig({ UPLOAD_DIR: "./uploads" }, "production"),
    ).toThrow(/absolute/);
  });

  it("accepts an absolute UPLOAD_DIR in production", () => {
    const dir = path.resolve("/srv/cafe/uploads");
    expect(parseStorageConfig({ UPLOAD_DIR: dir }, "production").uploadDir).toBe(dir);
  });

  it("refuses an unknown STORAGE_PROVIDER, naming it", () => {
    expect(() =>
      parseStorageConfig({ STORAGE_PROVIDER: "minio" }, "development"),
    ).toThrow(/"minio"/);
  });

  it("does not need the MinIO settings for the local provider", () => {
    expect(() =>
      parseStorageConfig({ STORAGE_PROVIDER: "local" }, "development"),
    ).not.toThrow();
  });

  it("requires every MinIO setting for s3, naming the missing ones", () => {
    expect(() =>
      parseStorageConfig(
        { STORAGE_PROVIDER: "s3", MINIO_ENDPOINT: "http://minio:9000" },
        "development",
      ),
    ).toThrow(/MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET/);
  });

  it("returns the s3 settings when they are all given", () => {
    const storage = parseStorageConfig(
      { STORAGE_PROVIDER: "s3", ...MINIO },
      "development",
    );
    expect(storage.s3).toEqual({
      endpoint: "http://minio:9000",
      accessKey: "access",
      secretKey: "secret",
      bucket: "cafe-images",
    });
  });
});
