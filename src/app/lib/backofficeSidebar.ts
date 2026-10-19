/**
 * The Backoffice sidebar's collapsed rail — touch tablets only
 * (touchTabletMedia). Laptops / desktops always get the full 260px
 * sidebar, phones the temporary drawer.
 *
 * Collapsed = a ~72px icon rail; expanded = the full sidebar. Until the
 * user taps the top bar's toggle, a touch tablet shows the rail in
 * portrait and the full sidebar in landscape — pure CSS, so the first
 * paint is already right. Once tapped, the choice is remembered per
 * device (localStorage SIDEBAR_PREFERENCE_KEY) and mirrored on
 * <body data-bo-sidebar="collapsed|expanded"> — set before the first
 * paint by SIDEBAR_PREFERENCE_SCRIPT (the Backoffice layout), so a
 * stored choice never flashes. <body> already has suppressHydrationWarning.
 * A plain module (not "use client"): the server layout reads it too.
 */
import {
  touchTabletMedia,
  touchTabletPortraitMedia,
} from "./theme/sharedThemeTokens";

/** The full sidebar's width (laptops, phones' drawer, tablets expanded). */
export const SIDEBAR_WIDTH = 260;
/** The collapsed icon rail's width (touch tablets). */
export const SIDEBAR_RAIL_WIDTH = 72;

export const SIDEBAR_PREFERENCE_KEY = "boSidebar:v1";
export const SIDEBAR_ATTRIBUTE = "data-bo-sidebar";

export type SidebarPreference = "collapsed" | "expanded";

/** A stored value as a preference; anything else → null (not chosen). */
export function parseSidebarPreference(
  value: string | null | undefined,
): SidebarPreference | null {
  return value === "collapsed" || value === "expanded" ? value : null;
}

/** Whether the rail shows: never off a touch tablet; else the user's
 *  choice, or — none yet — portrait. Pure; the CSS in whenSidebarRail
 *  says the same thing. */
export function isSidebarRail({
  preference,
  isTouchTablet,
  isPortrait,
}: {
  preference: SidebarPreference | null;
  isTouchTablet: boolean;
  isPortrait: boolean;
}): boolean {
  if (!isTouchTablet) return false;
  if (preference !== null) return preference === "collapsed";
  return isPortrait;
}

/** sx for "while the rail shows" — the CSS twin of isSidebarRail: a
 *  touch tablet that chose collapsed, or one in portrait that didn't
 *  choose expanded. Keyed by selector (media inside), so it never
 *  overwrites a caller's own [touchTabletMedia] key when spread. */
export function whenSidebarRail(styles: Record<string, unknown>) {
  return {
    [`body[${SIDEBAR_ATTRIBUTE}="collapsed"] &`]: {
      [touchTabletMedia]: styles,
    },
    [`body:not([${SIDEBAR_ATTRIBUTE}="expanded"]) &`]: {
      [touchTabletPortraitMedia]: styles,
    },
  };
}

/** Runs before the first paint (an inline script in the Backoffice
 *  layout): copies a stored choice onto <body>. Never throws (storage
 *  may be blocked). */
export const SIDEBAR_PREFERENCE_SCRIPT = `(function(){try{var v=localStorage.getItem(${JSON.stringify(
  SIDEBAR_PREFERENCE_KEY,
)});if(v==="collapsed"||v==="expanded")document.body.setAttribute(${JSON.stringify(
  SIDEBAR_ATTRIBUTE,
)},v)}catch(e){}})();`;
