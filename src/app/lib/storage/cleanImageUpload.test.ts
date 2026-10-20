import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { ValidationError } from "@/app/lib/errors";
import { cleanImageUpload } from "./cleanImageUpload";

// A tiny in-memory image (no files, no network) — sharp itself is the
// thing under test here.
const tinyPng = () =>
  sharp({
    create: { width: 2, height: 2, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();

describe("cleanImageUpload", () => {
  it("keeps a real PNG a PNG, re-encoded", async () => {
    const { buffer, contentType } = await cleanImageUpload(await tinyPng());
    expect(contentType).toBe("image/png");
    expect((await sharp(buffer).metadata()).format).toBe("png");
  });

  it("refuses bytes that aren't an image, whatever they claim to be", async () => {
    await expect(
      cleanImageUpload(Buffer.from("<?php echo 'hi'; ?>")),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("refuses an SVG (sharp could render it, but it's not an allowed format)", async () => {
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>',
    );
    await expect(cleanImageUpload(svg)).rejects.toThrow(
      "Image must be a PNG, JPEG, or WEBP file.",
    );
  });
});
