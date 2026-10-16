/** Text sizes for the phone bottom sheet — a step below (price: the
 *  same size as) what the same element uses in the centered dialog
 *  (name h6 1.1rem, price subtitle2 0.875rem, addon names body1 0.9rem,
 *  addon prices and descriptions body2 0.75rem), so the sheet reads
 *  compact on a small screen. The dialog keeps the theme's normal sizes.
 *  Never for form fields: their text comes from the theme (≥ 16px on
 *  phones, so iOS never zooms on focus — lib/theme/inputFontSize). */
export const SHEET_TEXT = {
  title: "1rem",
  price: "0.875rem",
  body: "0.8125rem",
  small: "0.6875rem",
} as const;
