import { describe, it, expect } from "vitest";
import { assetContentType, buildAssetKey, isAssetKey } from "./assetKey";

const NOW = 1730000000000;

describe("buildAssetKey", () => {
  it("names a menu photo <folder>/<id>-<timestamp>-<8 hex>.webp", () => {
    expect(buildAssetKey("menu", 12, NOW, "a1b2c3d4")).toBe(
      "menu/12-1730000000000-a1b2c3d4.webp",
    );
  });

  it("names a table QR image with .png", () => {
    expect(buildAssetKey("table", 5, NOW, "00ff00ff")).toBe(
      "table/5-1730000000000-00ff00ff.png",
    );
  });

  it("makes a fresh random suffix when none is given, so two keys in the same millisecond differ", () => {
    const first = buildAssetKey("menu", 1, NOW);
    const second = buildAssetKey("menu", 1, NOW);
    expect(isAssetKey(first)).toBe(true);
    expect(first).not.toBe(second);
  });

  it("only ever builds keys the allowlist accepts", () => {
    expect(isAssetKey(buildAssetKey("menu", 1, NOW))).toBe(true);
    expect(isAssetKey(buildAssetKey("table", 999, NOW))).toBe(true);
  });
});

describe("isAssetKey", () => {
  it("accepts a menu WebP and a table PNG", () => {
    expect(isAssetKey("menu/12-1730000000000-a1b2c3d4.webp")).toBe(true);
    expect(isAssetKey("table/5-1730000000000-00ff00ff.png")).toBe(true);
  });

  it("refuses path traversal and absolute paths", () => {
    for (const key of [
      "../etc/passwd",
      "menu/../../etc/passwd",
      "menu/../table/5-1730000000000-00ff00ff.png",
      "/etc/passwd",
      "/menu/12-1730000000000-a1b2c3d4.webp",
      "menu\\..\\12-1730000000000-a1b2c3d4.webp",
      "%2e%2e/menu/12-1730000000000-a1b2c3d4.webp",
    ]) {
      expect(isAssetKey(key)).toBe(false);
    }
  });

  it("refuses a folder that isn't ours", () => {
    expect(isAssetKey("logo/12-1730000000000-a1b2c3d4.webp")).toBe(false);
    expect(isAssetKey("12-1730000000000-a1b2c3d4.webp")).toBe(false);
  });

  it("refuses another extension, or the other folder's extension", () => {
    expect(isAssetKey("menu/12-1730000000000-a1b2c3d4.svg")).toBe(false);
    expect(isAssetKey("menu/12-1730000000000-a1b2c3d4.png")).toBe(false);
    expect(isAssetKey("table/5-1730000000000-00ff00ff.webp")).toBe(false);
    expect(isAssetKey("menu/12-1730000000000-a1b2c3d4.webp.html")).toBe(false);
  });

  it("refuses a malformed id, timestamp or suffix", () => {
    for (const key of [
      "menu/0-1730000000000-a1b2c3d4.webp",
      "menu/-1730000000000-a1b2c3d4.webp",
      "menu/12-173000000-a1b2c3d4.webp",
      "menu/12-1730000000000.webp",
      "menu/12-1730000000000-A1B2C3D4.webp",
      "menu/12-1730000000000-a1b2c3.webp",
      "MENU/12-1730000000000-a1b2c3d4.webp",
      "",
    ]) {
      expect(isAssetKey(key)).toBe(false);
    }
  });
});

describe("assetContentType", () => {
  it("serves each stored extension with its own type", () => {
    expect(assetContentType("menu/12-1730000000000-a1b2c3d4.webp")).toBe(
      "image/webp",
    );
    expect(assetContentType("table/5-1730000000000-00ff00ff.png")).toBe(
      "image/png",
    );
  });
});
