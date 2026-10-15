/**
 * The customer bottom bar's size, for the pages it floats over — a
 * plain module (not "use client"), so server pages can read it too.
 * Pages never repeat these numbers: they use BOTTOM_BAR_CLEARANCE.
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
