import { describe, it, expect } from "vitest";
import { mainImageUrl, resolveAssetUrl, toMenuImages } from "./assetUrl";

const KEY = "menu/12-1730000000000-a1b2c3d4.webp";

describe("resolveAssetUrl", () => {
  it("turns a stored key into the app's own relative /assets URL", () => {
    expect(resolveAssetUrl(KEY)).toBe(`/assets/${KEY}`);
  });

  it("is null for no image (null or empty)", () => {
    expect(resolveAssetUrl(null)).toBeNull();
    expect(resolveAssetUrl("")).toBeNull();
  });

  it("is null for anything that isn't one of our keys (an old full URL, a path)", () => {
    expect(
      resolveAssetUrl("http://localhost:9000/cafe-images/menu/12-1.png"),
    ).toBeNull();
    expect(resolveAssetUrl("../secret.png")).toBeNull();
  });
});

describe("mainImageUrl", () => {
  it("is the URL of the menu's main photo (the position-0 row its query selected)", () => {
    expect(mainImageUrl([{ imageKey: KEY }])).toBe(`/assets/${KEY}`);
  });

  it("is null for a menu with no photo", () => {
    expect(mainImageUrl([])).toBeNull();
  });
});

describe("toMenuImages", () => {
  it("lists every photo in position order as id + URL + position — never the key", () => {
    expect(
      toMenuImages([
        { id: 9, imageKey: "menu/1-1730000000001-0000000b.webp", position: 1 },
        { id: 8, imageKey: KEY, position: 0 },
      ]),
    ).toEqual([
      { id: 8, url: `/assets/${KEY}`, position: 0 },
      { id: 9, url: "/assets/menu/1-1730000000001-0000000b.webp", position: 1 },
    ]);
  });

  it("leaves out a row whose key isn't one of ours", () => {
    expect(toMenuImages([{ id: 1, imageKey: "nope", position: 0 }])).toEqual([]);
  });
});
