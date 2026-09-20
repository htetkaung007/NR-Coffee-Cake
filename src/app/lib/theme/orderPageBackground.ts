import { alpha, type Theme } from "@mui/material/styles";

/** Narrowest the menu page's frame is allowed to be. Below this the page
 *  stops shrinking (and scrolls sideways) instead of squeezing the top
 *  bar, search/category bar, card grid and bottom bar into a layout that
 *  breaks on very small phones. */
export const ORDER_PAGE_MIN_WIDTH = 375;

/** Shared by TableOrderClient and CounterOrderClient (page background)
 *  and MenuBrowser (sticky search/category bar, via its backgroundImage
 *  prop) — both flows use the exact same look, and both rely on
 *  backgroundAttachment: "fixed" so the sticky bar lines up pixel-for-
 *  pixel with the page behind it instead of reading as a flat color
 *  patch. One definition here keeps the two flows and the sticky bar
 *  from drifting out of sync.
 *
 *  A function of the theme (not constants) so the colors come from the
 *  Od palette; callers get the theme with useTheme() and pass it in. */
export function getOrderPageBackground(theme: Theme) {
  const { palette } = theme;
  // A full-strength tan glow is right on cream but glaring on the dark
  // background, so it's dialed down there.
  const accent =
    palette.mode === "light"
      ? palette.secondary.main
      : alpha(palette.secondary.main, 0.18);
  const wash = palette.decor.wash;

  return {
    color: palette.background.default,
    image: `
  radial-gradient(circle at 8% 15%, ${accent} 0%, transparent 30%),
  radial-gradient(circle at 92% 10%, ${wash} 0%, transparent 35%),
  radial-gradient(circle at 15% 90%, ${wash} 0%, transparent 30%),
  radial-gradient(circle at 90% 85%, ${accent} 0%, transparent 30%)
`,
  };
}
