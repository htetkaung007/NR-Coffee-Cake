"use client";

import { useMediaQuery } from "@mui/material";
import {
  touchTabletPortraitQuery,
  touchTabletQuery,
} from "@/app/lib/theme/sharedThemeTokens";
import {
  SIDEBAR_ATTRIBUTE,
  SIDEBAR_PREFERENCE_KEY,
  isSidebarRail,
  parseSidebarPreference,
} from "@/app/lib/backofficeSidebar";
import { useStoredValue, writeStorage } from "./useStoredValue";

/** The choice as mirrored on <body> — set from storage before the first
 *  paint and on every toggle, so it also covers blocked storage. */
function readPreference() {
  return parseSidebarPreference(document.body.getAttribute(SIDEBAR_ATTRIBUTE));
}

/** Whether the Backoffice sidebar is the collapsed rail right now (touch
 *  tablets only — lib/backofficeSidebar) and the top bar's toggle. The
 *  layout itself is CSS (whenSidebarRail); this is for what CSS can't do:
 *  the toggle's icon / aria, the items' aria-label and tooltips. */
export function useBackofficeSidebar() {
  const isTouchTablet = useMediaQuery(touchTabletQuery);
  const isPortrait = useMediaQuery(touchTabletPortraitQuery);
  const preference = useStoredValue(readPreference, null);
  const isRail = isSidebarRail({ preference, isTouchTablet, isPortrait });

  function toggle() {
    const next = isRail ? "expanded" : "collapsed";
    document.body.setAttribute(SIDEBAR_ATTRIBUTE, next);
    writeStorage(SIDEBAR_PREFERENCE_KEY, next);
  }

  return { isTouchTablet, isRail, toggle };
}
