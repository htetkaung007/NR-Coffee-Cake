import { describe, it, expect } from "vitest";
import { assetKeyFromUrl, rebaseAssetUrl } from "./assetUrl";

const BUCKET = "cafe-images";

describe("rebaseAssetUrl", () => {
  it("moves a localhost URL onto the current LAN address", () => {
    expect(
      rebaseAssetUrl(
        "http://localhost:9000/cafe-images/menu/12-1700000000.png",
        "http://192.168.1.20:9000",
        BUCKET,
      ),
    ).toBe("http://192.168.1.20:9000/cafe-images/menu/12-1700000000.png");
  });

  it("moves one IP onto another", () => {
    expect(
      rebaseAssetUrl(
        "http://192.168.1.20:9000/cafe-images/table/5-1700000000.png",
        "http://10.0.0.7:9000",
        BUCKET,
      ),
    ).toBe("http://10.0.0.7:9000/cafe-images/table/5-1700000000.png");
  });

  it("leaves an already-current URL as it is", () => {
    const url = "http://10.0.0.7:9000/cafe-images/menu/1-1.png";
    expect(rebaseAssetUrl(url, "http://10.0.0.7:9000", BUCKET)).toBe(url);
  });

  it("ignores a trailing slash on the endpoint", () => {
    expect(
      rebaseAssetUrl(
        "http://localhost:9000/cafe-images/menu/1-1.png",
        "https://files.example.com/",
        BUCKET,
      ),
    ).toBe("https://files.example.com/cafe-images/menu/1-1.png");
  });

  it("leaves a foreign URL untouched", () => {
    const url = "https://images.example.com/photos/latte.jpg";
    expect(rebaseAssetUrl(url, "http://10.0.0.7:9000", BUCKET)).toBe(url);
  });

  it("keeps an empty URL empty", () => {
    expect(rebaseAssetUrl("", "http://10.0.0.7:9000", BUCKET)).toBe("");
  });

  it("changes nothing when no storage address is configured", () => {
    const url = "http://localhost:9000/cafe-images/menu/1-1.png";
    expect(rebaseAssetUrl(url, "", BUCKET)).toBe(url);
  });
});

describe("assetKeyFromUrl", () => {
  it("reads the key after the bucket, whatever the host", () => {
    expect(
      assetKeyFromUrl("http://localhost:9000/cafe-images/menu/12-1.png", BUCKET),
    ).toBe("menu/12-1.png");
  });

  it("does not match the bucket name inside the host", () => {
    expect(
      assetKeyFromUrl("https://cafe-images.example.com/menu/1.png", BUCKET),
    ).toBeNull();
  });

  it("is null for a foreign URL, a relative path or an empty string", () => {
    expect(assetKeyFromUrl("https://example.com/a/b.png", BUCKET)).toBeNull();
    expect(assetKeyFromUrl("/cafe-images/menu/1.png", BUCKET)).toBeNull();
    expect(assetKeyFromUrl("", BUCKET)).toBeNull();
  });

  it("is null for the bucket itself with no key", () => {
    expect(assetKeyFromUrl("http://localhost:9000/cafe-images/", BUCKET)).toBeNull();
  });
});
