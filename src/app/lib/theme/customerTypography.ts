/**
 * The customer theme's text sizes (odTheme.ts) — ONE place, in px, so
 * the owner can tune a variant ±1px here and nowhere else. These are the
 * phone (xs) sizes; from `sm` / `md` up a variant keeps the shared
 * scale's size when that is already bigger, and is raised to this one
 * when it is smaller (never shrinks on a wider screen). The Backoffice
 * keeps the shared scale. Font sizes live ONLY in the themes (DESIGN.md
 * §12); components pick a variant, and their boxes use minHeight /
 * minWidth so they grow with the text. Pure.
 */

export const CUSTOMER_TEXT_PX = {
  caption: 13,
  body2: 15,
  body1: 16,
  subtitle2: 15,
  subtitle1: 16,
  button: 15,
} as const;

export type CustomerVariant = keyof typeof CUSTOMER_TEXT_PX;

/** px → rem (the browser's default 16px root), so the user's own text
 *  size setting still scales it. */
export function pxToRem(px: number): string {
  return `${+(px / 16).toFixed(4)}rem`;
}

/** A theme size as px — "0.95rem" → 15.2, a number → itself; anything
 *  else (calc, %) → null (not compared). */
export function sizeToPx(size: unknown): number | null {
  if (typeof size === "number") return size;
  if (typeof size !== "string") return null;
  const rem = /^([\d.]+)rem$/.exec(size);
  if (rem) return Number(rem[1]) * 16;
  const px = /^([\d.]+)px$/.exec(size);
  return px ? Number(px[1]) : null;
}

/** The typography overrides for odTheme's second createTheme pass:
 *  each variant's phone size, and every wider-screen size the shared
 *  scale sets (its "@media (min-width: …)" keys — the same strings
 *  theme.breakpoints.up() makes) raised to at least that. */
export function customerTypographyOverrides(
  shared: Record<string, unknown>,
): Record<CustomerVariant, Record<string, unknown>> {
  const overrides = {} as Record<CustomerVariant, Record<string, unknown>>;
  for (const [variant, phonePx] of Object.entries(CUSTOMER_TEXT_PX) as [
    CustomerVariant,
    number,
  ][]) {
    const rule: Record<string, unknown> = { fontSize: pxToRem(phonePx) };
    const base = shared[variant];
    if (base && typeof base === "object") {
      for (const [key, value] of Object.entries(base)) {
        if (!key.startsWith("@media") || !value || typeof value !== "object") continue;
        const widerPx = sizeToPx((value as { fontSize?: unknown }).fontSize);
        if (widerPx === null) continue;
        rule[key] = { fontSize: widerPx >= phonePx ? (value as { fontSize: unknown }).fontSize : pxToRem(phonePx) };
      }
    }
    overrides[variant] = rule;
  }
  return overrides;
}
