import { describe, it, expect } from "vitest";
import { phoneInputFontSize, phoneInputMedia } from "./inputFontSize";

describe("phoneInputFontSize", () => {
  it("raises a rem size to at least 16px, keeping the rem so it still scales", () => {
    expect(phoneInputFontSize("0.9rem")).toBe("max(16px, 0.9rem)");
  });

  it("raises a small pixel number to 16px", () => {
    expect(phoneInputFontSize(13)).toBe("16px");
  });

  it("keeps a pixel number that is already 16px or more", () => {
    expect(phoneInputFontSize(18)).toBe("18px");
  });

  it("falls back to 16px when the theme gives no size", () => {
    expect(phoneInputFontSize(undefined)).toBe("16px");
  });
});

describe("phoneInputMedia", () => {
  it("matches phone widths below sm and any touch-only screen", () => {
    expect(phoneInputMedia(600)).toBe(
      "@media (max-width:599.95px), (pointer: coarse)",
    );
  });
});
