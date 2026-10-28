import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { ValidationError } from "@/app/lib/errors";
import { MENU_PHOTO_MAX_WIDTH, cleanImageUpload } from "./cleanImageUpload";

// In-memory images (no files, no network) — sharp itself is the thing
// under test here.
const image = (width: number, height: number) =>
  sharp({
    create: { width, height, channels: 3, background: "#c08040" },
  });

/** A phone-photo-sized JPEG: 4000×3000 of noise (noise doesn't
 *  compress), a few MB — like a real camera photo. */
async function phonePhoto() {
  const width = 4000;
  const height = 3000;
  const noise = Buffer.alloc(width * height * 3);
  for (let i = 0; i < noise.length; i++) noise[i] = (i * 2654435761) >>> 24;
  return sharp(noise, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 95 })
    .withMetadata({ exif: { IFD0: { Make: "PhoneCo", Model: "Camera 9" } } })
    .toBuffer();
}

describe("cleanImageUpload — menu photo", () => {
  it("stores a menu photo as WebP", async () => {
    const input = await image(10, 10).png().toBuffer();
    const { buffer, contentType } = await cleanImageUpload(input, "menuPhoto");
    expect(contentType).toBe("image/webp");
    expect((await sharp(buffer).metadata()).format).toBe("webp");
  });

  it("scales a wide photo down to 1200px wide, keeping its shape", async () => {
    const input = await image(3000, 2000).jpeg().toBuffer();
    const { buffer } = await cleanImageUpload(input, "menuPhoto");
    const { width, height } = await sharp(buffer).metadata();
    expect(width).toBe(MENU_PHOTO_MAX_WIDTH);
    expect(height).toBe(800);
  });

  it("never enlarges a small photo", async () => {
    const input = await image(400, 300).webp().toBuffer();
    const { buffer } = await cleanImageUpload(input, "menuPhoto");
    expect((await sharp(buffer).metadata()).width).toBe(400);
  });

  it("turns a sideways phone photo upright from its EXIF orientation", async () => {
    // Stored 300×200 with "rotate 90°" in EXIF — shown as 200×300.
    const input = await image(300, 200)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const { buffer } = await cleanImageUpload(input, "menuPhoto");
    const { width, height, orientation } = await sharp(buffer).metadata();
    expect([width, height]).toEqual([200, 300]);
    expect(orientation).toBeUndefined();
  });

  it("takes a ~4 MB phone photo down to a small WebP with no camera metadata", async () => {
    const input = await phonePhoto();
    expect(input.length).toBeGreaterThan(3 * 1024 * 1024);
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const { buffer } = await cleanImageUpload(input, "menuPhoto");
    const metadata = await sharp(buffer).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(MENU_PHOTO_MAX_WIDTH);
    expect(metadata.exif).toBeUndefined();
    expect(buffer.length).toBeLessThan(input.length);
  }, 30_000);
});

describe("cleanImageUpload — QR logo", () => {
  it("keeps a real PNG a PNG, re-encoded, at its own size", async () => {
    const input = await image(1600, 1600).png().toBuffer();
    const { buffer, contentType } = await cleanImageUpload(input, "qrLogo");
    expect(contentType).toBe("image/png");
    const metadata = await sharp(buffer).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1600);
  });
});

describe("cleanImageUpload — the format check", () => {
  it("refuses bytes that aren't an image, whatever they claim to be", async () => {
    for (const kind of ["menuPhoto", "qrLogo"] as const) {
      await expect(
        cleanImageUpload(Buffer.from("<?php echo 'hi'; ?>"), kind),
      ).rejects.toBeInstanceOf(ValidationError);
    }
  });

  it("refuses an SVG (sharp could render it, but it's not an allowed format)", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>',
    );
    await expect(cleanImageUpload(svg, "menuPhoto")).rejects.toThrow(
      "Image must be a PNG, JPEG, or WEBP file.",
    );
  });
});
