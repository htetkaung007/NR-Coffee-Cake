import { describe, it, expect } from "vitest";
import {
  MYANMAR_FONT_SCALE,
  myanmarTypographyStyles,
  scaledFontSize,
} from "./myanmarTypography";

describe("scaledFontSize", () => {
  it("scales a rem size with calc, keeping its unit", () => {
    expect(scaledFontSize("1rem", 0.9)).toBe("calc(1rem * 0.9)");
  });

  it("scales a pixel number", () => {
    expect(scaledFontSize(20, 0.5)).toBe("10px");
  });
});

describe("myanmarTypographyStyles", () => {
  const typography = {
    h6: { fontSize: "1.25rem", lineHeight: 1.3, "@media (min-width:900px)": { fontSize: "1.5rem" } },
    body2: { fontSize: "0.875rem", lineHeight: 1.43 },
    caption: { fontSize: "0.75rem", lineHeight: 2 },
    button: { fontSize: "0.875rem", lineHeight: 1.75 },
  };
  const styles = myanmarTypographyStyles(typography, 0.9) as Record<string, Record<string, unknown>>;

  it("applies only to Myanmar text (:lang(my))", () => {
    expect(Object.keys(styles).every((selector) => selector.includes(":lang(my)"))).toBe(true);
  });

  it("scales each variant's size, at every breakpoint", () => {
    const h6 = styles[".MuiTypography-h6:lang(my)"];
    expect(h6.fontSize).toBe("calc(1.25rem * 0.9)");
    expect(h6["@media (min-width:900px)"]).toEqual({ fontSize: "calc(1.5rem * 0.9)" });
  });

  it("gives headings at least 1.6 line-height", () => {
    expect(styles[".MuiTypography-h6:lang(my)"].lineHeight).toBe(1.6);
  });

  it("gives body text at least 1.8 line-height", () => {
    expect(styles[".MuiTypography-body2:lang(my)"].lineHeight).toBe(1.8);
  });

  it("keeps a taller line-height that's already enough", () => {
    expect(styles[".MuiTypography-caption:lang(my)"].lineHeight).toBe(2);
    expect(styles[".MuiButton-root:lang(my)"].lineHeight).toBe(1.75);
  });

  it("covers buttons and tabs with the button variant", () => {
    expect(styles[".MuiButton-root:lang(my)"].fontSize).toBe("calc(0.875rem * 0.9)");
    expect(styles[".MuiTab-root:lang(my)"].fontSize).toBe("calc(0.875rem * 0.9)");
  });

  it("skips a variant the theme doesn't define", () => {
    expect(styles[".MuiTypography-h5:lang(my)"]).toBeUndefined();
  });

  it("starts from the 0.92 scale", () => {
    expect(MYANMAR_FONT_SCALE).toBe(0.92);
  });
});
