/**
 * Form-field text on phones — never under 16px. iOS Safari zooms the
 * whole page when a focused field's text is smaller than that, and it
 * checks only the computed size. So the theme (sharedThemeTokens.ts —
 * MuiInputBase / MuiInputLabel) raises the input, its placeholder and its
 * label to at least 16px on phones: below `sm`, and on any touch-only
 * screen (a phone in landscape is wider than `sm`). Zoom itself stays
 * allowed — never maximum-scale / user-scalable in the viewport.
 * The Myanmar scale (myanmarTypography.ts) never targets fields. Pure.
 */

const INPUT_MIN_FONT_SIZE_PX = 16;

/** Where the rule applies: phone widths, or a coarse (touch) pointer. */
export function phoneInputMedia(smBreakpointPx: number): string {
  return `@media (max-width:${smBreakpointPx - 0.05}px), (pointer: coarse)`;
}

/** The theme's own size for field text, raised to at least 16px:
 *  "0.9rem" → "max(16px, 0.9rem)" (still grows with the user's own
 *  browser text size); a pixel number → pixels. */
export function phoneInputFontSize(size: string | number | undefined): string {
  const min = `${INPUT_MIN_FONT_SIZE_PX}px`;
  if (size === undefined) return min;
  if (typeof size === "number") return `${Math.max(size, INPUT_MIN_FONT_SIZE_PX)}px`;
  return `max(${min}, ${size})`;
}
