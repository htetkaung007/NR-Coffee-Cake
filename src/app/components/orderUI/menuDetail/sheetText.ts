/** Text sizes for the phone bottom sheet — each one step below what the
 *  same element uses in the centered dialog (name h6 1.1rem, price
 *  subtitle1 1rem, addon names / inputs body1 0.9rem, addon prices and
 *  descriptions body2 0.75rem), so the sheet reads compact on a small
 *  screen. The dialog keeps the theme's normal sizes. */
export const SHEET_TEXT = {
  title: "1rem",
  price: "0.875rem",
  body: "0.8125rem",
  small: "0.6875rem",
} as const;
