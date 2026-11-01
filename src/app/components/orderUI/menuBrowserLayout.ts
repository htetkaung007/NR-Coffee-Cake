import type { SxProps, Theme } from "@mui/material/styles";
import {
  touchCardGap,
  touchTabletMedia,
  touchTabletPortraitMedia,
} from "@/app/lib/theme/sharedThemeTokens";

/**
 * The customer menu's layout, in ONE place — the real page (MenuBrowser,
 * OrderPlaceHeader) and its loading skeleton (CustomerPageSkeletons) draw
 * the same boxes, so nothing jumps when the content arrives.
 */

/** Matches MUI's default Toolbar height (theme.mixins.toolbar) so the
 *  sticky search/category bar picks up exactly where OrderTopBar's
 *  own sticky AppBar ends, instead of overlapping under it or leaving
 *  a gap above it. */
const TOPBAR_HEIGHT = { xs: 56, sm: 64 };

/** LANDSCAPE touch tablets: the grid fits as many columns as its width
 *  allows, each at least this wide (auto-fill + minmax, never a fixed
 *  count) — 4 at 1180px, 5 at 1280px. Above 210 so 1180px stays at 4. */
const TOUCH_CARD_MIN_PX = 212;
/** PORTRAIT touch tablets: never narrower than this, and at most 3
 *  columns (portraitColumns below). Widths are CSS px, not the spec
 *  sheet's: an "800×1280" Android tablet at device pixel ratio ~1.33 is
 *  ~600px wide — a ~552px grid → 3 × ~173px. 3 columns down to a 482px
 *  grid (3 × 150 + 2 gaps), 2 below that. */
const TOUCH_PORTRAIT_CARD_MIN_PX = 150;
/** Portrait's track: at least TOUCH_PORTRAIT_CARD_MIN_PX, and at least a
 *  third of the row minus its two gaps — so auto-fill fits 3 columns at
 *  most, still flexible (fewer only when even 150px doesn't fit). `gap`
 *  is the grid's gap in px (theme.spacing(touchCardGap)). */
const portraitColumns = (gap: string) =>
  `repeat(auto-fill, minmax(max(${TOUCH_PORTRAIT_CARD_MIN_PX}px, calc((100% - 2 * ${gap}) / 3)), 1fr))`;

/** The sticky bars blend into the page: opaque, the page's own look. */
export interface MenuBarBackground {
  color: string;
  image?: string;
  attachment?: string;
}

/** Under OrderPlaceHeader: 8px on a touch tablet (the sticky search row
 *  adds its own 8px on top), so it keeps two rows of menu cards in view. */
export const placeHeaderSpacingSx = {
  mb: 2,
  [touchTabletMedia]: { mb: 1 },
};

/** Search + category tabs. Phones (below sm): ONLY the search is sticky
 *  (menuSearchBoxSx); the tabs sit under it in normal flow and scroll away
 *  with the menu. From sm the whole block is sticky — search full width
 *  with the tabs under it (laptops, desktops), or ONE row on a touch tablet
 *  (touchTabletMedia), so 4 columns keep two rows of cards in view. On
 *  phones this wrapper is display "contents" (no box of its own), so the
 *  search's sticky box spans the whole page. */
export function menuFilterRowSx(background: MenuBarBackground): SxProps<Theme> {
  return {
    display: { xs: "contents", sm: "block" },
    position: { sm: "sticky" },
    top: TOPBAR_HEIGHT,
    zIndex: { sm: 3 },
    bgcolor: { sm: background.color },
    backgroundImage: { sm: background.image },
    backgroundAttachment: { sm: background.attachment },
    pt: { sm: 1 },
    mb: { sm: 3 },
    [touchTabletMedia]: {
      display: "flex",
      alignItems: "center",
      columnGap: 2,
      // 8px (the grid's own 8px padding follows) — the height
      // budget for two rows of cards.
      mb: 1,
    },
  };
}

export function menuSearchBoxSx(background: MenuBarBackground): SxProps<Theme> {
  return {
    position: { xs: "sticky", sm: "static" },
    top: TOPBAR_HEIGHT,
    zIndex: { xs: 3, sm: "auto" },
    bgcolor: { xs: background.color, sm: "transparent" },
    backgroundImage: { xs: background.image, sm: "none" },
    backgroundAttachment: { xs: background.attachment },
    pt: { xs: 1, sm: 0 },
    pb: { xs: 1, sm: 0 },
    mb: { sm: 2 },
    // Touch tablet: a share on the left of the one row — 340px in
    // landscape; in portrait 45% (≥ 200px), so the categories
    // keep the rest (~296px on a 600px tablet).
    [touchTabletMedia]: { width: 340, flexShrink: 0, mb: 0 },
    [touchTabletPortraitMedia]: {
      width: "auto",
      flex: "0 1 45%",
      minWidth: 200,
    },
  };
}

/** The category row's box. */
export const menuCategoryRowSx = {
  minHeight: 44,
  // Phones: 16px under the field (its 8px + this 8px), 24px
  // above the grid. Touch tablet: fills the rest of the row.
  mt: { xs: 1, sm: 0 },
  mb: { xs: 3, sm: 0 },
  [touchTabletMedia]: { flex: 1, minWidth: 0 },
};

export function menuGridSx(theme: Theme): SxProps<Theme> {
  return {
    // No min width of its own: the grid fits whatever the page's
    // content column is (343px at a 375px screen).
    minWidth: 0,
    // Don't let cards balloon on very wide screens.
    maxWidth: 1400,
    mx: "auto",
    display: "grid",
    // 2 columns on phones, then 3 / 4 at sm / md (600 / 900) —
    // 4 is the most.
    gridTemplateColumns: {
      xs: "repeat(2, 1fr)",
      sm: "repeat(3, 1fr)",
      md: "repeat(4, 1fr)",
    },
    // xs: 14px gap + 4px side padding → with the page's 16px, a
    // 390px phone gets (390 - 40 - 14) / 2 = 168px cards.
    gap: { xs: 1.75, sm: 2, md: 2.5 },
    p: { xs: 0.5, sm: 1, md: 3 },
    // Touch tablets: compact cards (MenuCard compact). Landscape:
    // as many as fit, each ≥ TOUCH_CARD_MIN_PX — 1180px: 4 ×
    // ~267px; 1280px: 5 × ~214px. Portrait: at most 3, each ≥
    // 150px — 600px: 3 × ~173px; 820px: 3 × ~247px.
    [touchTabletMedia]: {
      gridTemplateColumns: `repeat(auto-fill, minmax(${TOUCH_CARD_MIN_PX}px, 1fr))`,
      gap: touchCardGap,
      p: 1,
    },
    [touchTabletPortraitMedia]: {
      gridTemplateColumns: portraitColumns(theme.spacing(touchCardGap)),
    },
    // Cards fill their cell height (see MenuCard) so every card
    // in a row lines up.
    alignItems: "stretch",
  };
}
