/**
 * Myanmar text on customer screens — tuned in ONE place. Burmese glyphs
 * look larger than Latin at the same size, and stacked vowels and medials
 * (ကြို, ပြီ, ကျွန်) need taller lines or they get clipped. So text whose
 * language is Myanmar (`:lang(my)` — the storefront sets lang on its
 * pages) is drawn a little smaller, with a minimum line-height. English
 * sizes, the Backoffice and components are never touched (DESIGN.md
 * §12): the customer theme adds these rules through its CssBaseline
 * (odTheme.ts).
 */

/** Myanmar text size relative to the theme's own size for each variant.
 *  THE knob to tune by eye: 1 = the English size, lower = smaller. */
export const MYANMAR_FONT_SCALE = 0.92;

/** Smallest line-height for Myanmar headings, subtitles and buttons. */
const MIN_LINE_HEIGHT_HEADING = 1.6;
/** Smallest line-height for Myanmar body text and captions. */
const MIN_LINE_HEIGHT_BODY = 1.8;

/** The typography variants used on customer screens, with their minimum
 *  line-height, and the CSS selector of the element drawn in them. */
const TARGETS: { variant: string; selector: string; minLineHeight: number }[] = [
  ...["h5", "h6", "subtitle1", "subtitle2"].map((variant) => ({
    variant,
    selector: `.MuiTypography-${variant}`,
    minLineHeight: MIN_LINE_HEIGHT_HEADING,
  })),
  ...["body1", "body2", "caption"].map((variant) => ({
    variant,
    selector: `.MuiTypography-${variant}`,
    minLineHeight: MIN_LINE_HEIGHT_BODY,
  })),
  // Buttons and tabs are drawn in the `button` variant.
  { variant: "button", selector: ".MuiButton-root", minLineHeight: MIN_LINE_HEIGHT_HEADING },
  { variant: "button", selector: ".MuiTab-root", minLineHeight: MIN_LINE_HEIGHT_HEADING },
];

type FontSize = string | number;

/** A theme font size times `scale`: "1rem" → "calc(1rem * 0.92)" (any
 *  unit), a pixel number → pixels. */
export function scaledFontSize(size: FontSize, scale: number): string {
  return typeof size === "number" ? `${size * scale}px` : `calc(${size} * ${scale})`;
}

/** A variant's line-height raised to at least `min` (a unitless number
 *  from the theme; anything else is replaced by `min`). */
function atLeast(lineHeight: unknown, min: number): number {
  return typeof lineHeight === "number" ? Math.max(lineHeight, min) : min;
}

/** The `:lang(my)` rules for the theme's typography — each customer
 *  variant scaled by `scale` (at every breakpoint it defines) and given
 *  its minimum line-height. Pure. */
export function myanmarTypographyStyles(
  typography: Record<string, unknown>,
  scale: number = MYANMAR_FONT_SCALE,
): Record<string, Record<string, unknown>> {
  const styles: Record<string, Record<string, unknown>> = {};
  for (const target of TARGETS) {
    const variant = typography[target.variant];
    if (!variant || typeof variant !== "object") continue;
    const { fontSize, lineHeight, ...rest } = variant as Record<string, unknown>;
    const rule: Record<string, unknown> = {
      lineHeight: atLeast(lineHeight, target.minLineHeight),
    };
    if (typeof fontSize === "string" || typeof fontSize === "number") {
      rule.fontSize = scaledFontSize(fontSize, scale);
    }
    // Responsive sizes (the theme's "@media (min-width: …)" keys).
    for (const [key, value] of Object.entries(rest)) {
      if (!key.startsWith("@media") || !value || typeof value !== "object") continue;
      const mediaSize = (value as { fontSize?: FontSize }).fontSize;
      if (mediaSize !== undefined) rule[key] = { fontSize: scaledFontSize(mediaSize, scale) };
    }
    styles[`${target.selector}:lang(my)`] = rule;
  }
  return styles;
}
