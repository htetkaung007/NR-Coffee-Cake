import { touchTabletLandscapeMedia } from "@/app/lib/theme/sharedThemeTokens";

/**
 * The customer bar's size, for the pages it floats over — a plain module
 * (not "use client"), so server pages can read it too. Pages never
 * repeat these numbers or the media query: the frame takes
 * barClearanceSx, the content under the top bar railClearanceSx.
 *
 * Two shapes, switched by CSS only (touchTabletLandscapeMedia — a touch
 * screen held landscape; laptops never match): a pill at the bottom
 * (everywhere else), or a vertical rail on the RIGHT edge (DESIGN.md
 * §18).
 */

/** The pill's height: a 44px item row (20px icon + caption, the touch
 *  minimum) +
 *  4px padding top and bottom + its 1px border. */
const BOTTOM_BAR_HEIGHT_PX = 54;

/** Its gap to the bottom of the screen (plus the safe area). */
export const BOTTOM_BAR_OFFSET_PX = 12;

/** The space between the bar and what stacks above it (/cart's Send). */
const STACK_GAP_PX = 8;

/** Bottom space a page keeps free so nothing ends behind the bar: the
 *  bar + its offset + the gap + the home-indicator safe area. */
export const BOTTOM_BAR_CLEARANCE = `calc(${
  BOTTOM_BAR_HEIGHT_PX + BOTTOM_BAR_OFFSET_PX + STACK_GAP_PX
}px + env(safe-area-inset-bottom, 0px))`;

/** The rail's items (48px of caption room inside the 4px side padding).
 *  A caption wider than that wraps between syllables — never inside one,
 *  never cut. Myanmar has no spaces, so a long word carries a zero-width
 *  space (U+200B) at its syllable break in messages/my.json:
 *  "ခြင်း​တောင်း" (nav.cart) → "ခြင်း" / "တောင်း". */
export const RAIL_ITEM_WIDTH_PX = 56;

/** …and tall enough for the icon + caption with room around them (the
 *  44px touch minimum is far exceeded). */
export const RAIL_ITEM_MIN_HEIGHT_PX = 92;

/** The rail: its items + the list's 4px padding each side + the 1px
 *  border each side. */
export const RAIL_WIDTH_PX = RAIL_ITEM_WIDTH_PX + 2 * 4 + 2 * 1;

/** The rail's gap to the right edge of the screen (plus the safe area). */
export const RAIL_OFFSET_PX = 10;

/** Right space the content keeps free under the rail: the rail + its
 *  offset + the gap + the landscape notch's safe area. */
export const RAIL_CLEARANCE = `calc(${
  RAIL_WIDTH_PX + RAIL_OFFSET_PX + STACK_GAP_PX
}px + env(safe-area-inset-right, 0px))`;

/** The page frame's bottom room: the bottom bar's clearance — or, under
 *  the rail, just the page's normal bottom edge (16px + the home
 *  indicator), so /cart's Send sits at the bottom. Use it in an sx
 *  array (it never overwrites the page's own keys). */
export const barClearanceSx = {
  pb: BOTTOM_BAR_CLEARANCE,
  [touchTabletLandscapeMedia]: {
    pb: "calc(16px + env(safe-area-inset-bottom, 0px))",
  },
};

/** The content under the top bar keeps the rail's room on the right —
 *  only under the rail; nothing changes anywhere else. The top bar stays
 *  full width (the rail sits below it). */
export const railClearanceSx = {
  [touchTabletLandscapeMedia]: { pr: RAIL_CLEARANCE },
};
