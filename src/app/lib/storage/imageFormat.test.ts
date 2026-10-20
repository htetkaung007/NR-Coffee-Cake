import { describe, it, expect } from "vitest";
import { asUploadImageFormat, imageContentType } from "./imageFormat";

describe("asUploadImageFormat", () => {
  it("allows JPEG, PNG and WebP", () => {
    expect(asUploadImageFormat("jpeg")).toBe("jpeg");
    expect(asUploadImageFormat("png")).toBe("png");
    expect(asUploadImageFormat("webp")).toBe("webp");
  });

  it("refuses every other format, and an unreadable file", () => {
    for (const format of ["svg", "gif", "heif", "tiff", "pdf", "", undefined]) {
      expect(asUploadImageFormat(format)).toBeNull();
    }
  });
});

describe("imageContentType", () => {
  it("serves each allowed format with its own content type", () => {
    expect(imageContentType("jpeg")).toBe("image/jpeg");
    expect(imageContentType("png")).toBe("image/png");
    expect(imageContentType("webp")).toBe("image/webp");
  });
});
