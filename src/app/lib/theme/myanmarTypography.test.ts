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

  it("never shrinks form fields — their text stays at least 16px on phones (no iOS focus zoom)", () => {
    const all = myanmarTypographyStyles({
      ...typography,
      body1: { fontSize: "0.9rem", lineHeight: 1.75 },
      subtitle1: { fontSize: "1rem", lineHeight: 1.5 },
    });
    expect(
      Object.keys(all).filter((selector) =>
        /Input|Select|Autocomplete|TextField|input|textarea/.test(selector),
      ),
    ).toEqual([]);
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

  it("covers buttons, tabs and toggle buttons with the button variant", () => {
    expect(styles[".MuiButton-root:lang(my)"].fontSize).toBe("calc(0.875rem * 0.9)");
    expect(styles[".MuiTab-root:lang(my)"].fontSize).toBe("calc(0.875rem * 0.9)");
    expect(styles[".MuiToggleButton-root:lang(my)"].fontSize).toBe("calc(0.875rem * 0.9)");
  });

  it("covers the staff screens' menu rows and table cells", () => {
    const all = myanmarTypographyStyles({
      body1: { fontSize: "1rem", lineHeight: 1.5 },
      body2: { fontSize: "0.875rem", lineHeight: 1.43 },
    });
    expect(all[".MuiMenuItem-root:lang(my)"].lineHeight).toBe(1.8);
    expect(all[".MuiTableCell-root:lang(my)"].fontSize).toBe("calc(0.875rem * 0.96)");
  });

  it("covers the page-title headings too", () => {
    const all = myanmarTypographyStyles({ h4: { fontSize: "2rem", lineHeight: 1.2 } });
    expect(all[".MuiTypography-h4:lang(my)"].lineHeight).toBe(1.6);
  });

  it("drops letter-spacing for Myanmar text", () => {
    expect(styles[".MuiTypography-caption:lang(my)"].letterSpacing).toBe("normal");
  });

  it("skips a variant the theme doesn't define", () => {
    expect(styles[".MuiTypography-h5:lang(my)"]).toBeUndefined();
  });

  it("starts from the 0.96 scale", () => {
    expect(MYANMAR_FONT_SCALE).toBe(0.96);
  });
});
