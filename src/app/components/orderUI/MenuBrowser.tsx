"use client";

import { useMemo, useRef, useState } from "react";
import {
  Box,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";

import MenuDetailDialog from "./MenuDetailDialog";
import { useLocale, useMessages, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { matchesMenuSearch } from "@/app/lib/storefront/menuSearch";
import MenuCard from "../MenuCard";
import {
  touchTabletMedia,
  touchTabletPortraitMedia,
  touchTabletQuery,
} from "@/app/lib/theme/sharedThemeTokens";
import { menuCardLabels } from "@/app/lib/i18n/customerLabels";
import type { MenuDetail } from "./menuDetail/types";

export interface MenuOption {
  id: number;
  name: string;
  /** Myanmar name / description (null: the English ones show). */
  nameMy?: string | null;
  price: number;
  description: string;
  descriptionMy?: string | null;
  /** The menu's categories by their English name — the tab filter's key
   *  (a tab shows its localized label, never filters on it). */
  categories: string[];
  imageUrl: string | null;
  stockQuantity: number;
  isAvailable: boolean;
}

/** A category tab: its English name (the key) and Myanmar name. */
export interface CategoryTab {
  name: string;
  nameMy?: string | null;
}

/** "All" is a synthetic tab, never a real category name from the DB —
 *  kept as a constant so the comparison below can't drift out of sync
 *  with the Tab's own value. Its LABEL is translated (menu.all); this
 *  value never shows. */
const ALL_CATEGORIES = "All";

interface MenuBrowserProps {
  menus: MenuOption[];
  /** The category tabs after "All", in the server's order — the visible
   *  categories that hold at least one of `menus` (see
   *  MenuService.getMenusForLocation). Rendered as-is, never re-sorted.
   *  `name` (English) is the tab's key; the label is localizedText. */
  categories: CategoryTab[];
  locationId: number;
  canOrder: boolean;
  /** Matches the caller page's own background so the sticky search/
   *  category bar blends in instead of showing up as a mismatched flat
   *  block against that page's background. Must be opaque — this bar
   *  paints above the menu grid (z-index 3) while the customer
   *  scrolls, so "transparent" lets scrolled-up cards show through it
   *  instead of being hidden underneath. */
  backgroundColor: string;
  /** Optional — lets a caller with a `backgroundAttachment: "fixed"`
   *  page background (e.g. TableOrderClient's radial-gradient) hand the
   *  same image/attachment to the sticky bar so it lines up pixel-for-
   *  pixel with what's behind it instead of reading as a flat color
   *  patch. Layered on top of backgroundColor as a fallback. */
  backgroundImage?: string;
  backgroundAttachment?: string;
  /** Called once the customer confirms Add-to-cart inside the detail
   *  dialog (addons + quantity already resolved there). Returns an
   *  error message string to show inline in the dialog, or null on
   *  success — same contract MenuDetailDialog itself expects. */
  onAddToCart: (
    menu: { id: number; name: string; nameMy?: string | null; price: number },
    quantity: number,
    addonIds: number[],
    note: string,
    /** The item as the dialog showed it — see MenuDetailDialog's onSubmit. */
    detail: MenuDetail,
  ) => Promise<string | null>;
}

/** Matches MUI's default Toolbar height (theme.mixins.toolbar) so the
 *  sticky search/category bar picks up exactly where OrderTopBar's
 *  own sticky AppBar ends, instead of overlapping under it or leaving
 *  a gap above it. */
const TOPBAR_HEIGHT = { xs: 56, sm: 64 };

/** Touch tablets: the grid fits as many columns as its width allows,
 *  each at least this wide (auto-fill + minmax, never a fixed count) —
 *  3 at 800–820px portrait (from a ~732px screen up), 4 at 1180px and 5
 *  at 1280px landscape. Above 210 so 1180px stays at 4. */
const TOUCH_CARD_MIN_PX = 212;
/** …and in PORTRAIT a smaller one, so 3 columns fit even on a tablet whose
 *  browser is narrower than its spec (an "800px" Android tablet at 1.125×
 *  scale is ~710 CSS px: a ~647px grid → 3 × ~205px). Portrait only, so
 *  landscape keeps the counts above (1180px: 4). */
const TOUCH_PORTRAIT_CARD_MIN_PX = 200;
/** …with this gap between them (theme spacing: 16px). */
const TOUCH_CARD_GAP = 2;

/**
 * Browsing surface only: search box, category tabs, the MenuCard
 * grid, and the detail dialog a card click opens. Cart contents and
 * the order-submit flow live outside this component (on their own
 * /cart route — see cart/page.tsx) — this is "pick something to add",
 * not "what's already in the cart".
 */
export default function MenuBrowser({
  menus,
  categories: categoryNames,
  locationId,
  canOrder,
  backgroundColor,
  backgroundImage,
  backgroundAttachment,
  onAddToCart,
}: MenuBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
  const [detailMenuId, setDetailMenuId] = useState<number | null>(null);
  const t = useTranslations("menu");
  const locale = useLocale();
  const messages = useMessages();
  // The one key → label mapping (lib/i18n/customerLabels), shared with
  // staff New Order's မြန်မာ view.
  const cardLabels = useMemo(
    () => menuCardLabels(locale, messages),
    [locale, messages],
  );

  // Each tab: its key (the English name, what menus are filtered by)
  // and its label in the customer's language.
  const categories = useMemo(
    () => [
      { key: ALL_CATEGORIES, label: t("all") },
      ...categoryNames.map((category) => ({
        key: category.name,
        label: localizedText(locale, category.name, category.nameMy),
      })),
    ],
    [categoryNames, locale, t],
  );

  // MUI's scrollable Tabs only nudges the newly-selected tab just far
  // enough into view (can still leave it sitting flush against the
  // edge, half-hidden behind the scroll button). Centering it instead
  // on every tap reveals a neighbor on each side, which reads much
  // better on mobile where the corner-most tab is the one most likely
  // to be tapped while only partly visible.
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // What's pinned under the top bar: on phones the search alone, from
  // sm the whole search + categories block (one row on a touch tablet).
  // Phones and touch tablets: picking a category while scrolled down
  // brings the grid's top back just under it (never when the grid top is
  // already in view). Laptops / desktops keep the original behaviour.
  const theme = useTheme();
  const isWholeBlockPinned = useMediaQuery(theme.breakpoints.up("sm"));
  const isTouchTablet = useMediaQuery(touchTabletQuery);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const filterRowRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  function bringGridUnderPinnedBar() {
    if (isWholeBlockPinned && !isTouchTablet) return;
    const pinned = (isWholeBlockPinned ? filterRowRef : searchRef).current;
    const grid = gridRef.current;
    if (!pinned || !grid) return;
    const overlap =
      pinned.getBoundingClientRect().bottom - grid.getBoundingClientRect().top;
    if (overlap > 0) {
      window.scrollBy({
        top: -overlap,
        behavior: reduceMotion ? "auto" : "smooth",
      });
    }
  }

  const visibleMenus = useMemo(
    () =>
      menus.filter(
        (menu) =>
          (activeCategory === ALL_CATEGORIES ||
            menu.categories.includes(activeCategory)) &&
          // Both names, whatever language is chosen.
          matchesMenuSearch(menu, searchTerm),
      ),
    [menus, activeCategory, searchTerm],
  );

  return (
    <>
      {/* Search + category tabs. Phones (below sm): ONLY the search is
         sticky (its own box below); the tabs sit under it in normal flow
         and scroll away with the menu. From sm the whole block is sticky
         — search full width with the tabs under it (laptops, desktops),
         or ONE row on a touch tablet (touchTabletMedia), so 4 columns
         keep two rows of cards in view. One set of controls either way:
         on phones this wrapper is display "contents" (no box of its
         own), so the search's sticky box spans the whole page. */}
      <Box
        ref={filterRowRef}
        sx={{
          display: { xs: "contents", sm: "block" },
          position: { sm: "sticky" },
          top: TOPBAR_HEIGHT,
          zIndex: { sm: 3 },
          bgcolor: { sm: backgroundColor },
          backgroundImage: { sm: backgroundImage },
          backgroundAttachment: { sm: backgroundAttachment },
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
        }}
      >
        <Box
          ref={searchRef}
          sx={{
            position: { xs: "sticky", sm: "static" },
            top: TOPBAR_HEIGHT,
            zIndex: { xs: 3, sm: "auto" },
            bgcolor: { xs: backgroundColor, sm: "transparent" },
            backgroundImage: { xs: backgroundImage, sm: "none" },
            backgroundAttachment: { xs: backgroundAttachment },
            pt: { xs: 1, sm: 0 },
            pb: { xs: 1, sm: 0 },
            mb: { sm: 2 },
            // Touch tablet: a fixed share on the left of the one row.
            [touchTabletMedia]: { width: 340, flexShrink: 0, mb: 0 },
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
        </Box>

        {/* Category pills — MUI's scrollable Tabs: touch-scrolls on
           phones, arrows from sm up (only when the row overflows), and
           keeps role="tab" / aria-selected / arrow keys. Each Tab is the
           44px tap area; its ::before draws the 36px pill (unselected:
           paper + 1px inputBorder, ≥ 3:1 on the page; selected: primary
           fill, same 1px border so nothing jumps). The row sits in the
           same padding as the search field above. MUI v9's list class is
           .MuiTabs-list (v5's .MuiTabs-flexContainer no longer exists). */}
        <Tabs
          value={activeCategory}
          onChange={(_, value) => {
            bringGridUnderPinnedBar();
            setActiveCategory(value);
            tabRefs.current[value]?.scrollIntoView({
              behavior: "smooth",
              inline: "center",
              block: "nearest",
            });
          }}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile={false}
          slotProps={{ indicator: { sx: { display: "none" } } }}
          sx={{
            minHeight: 44,
            // Phones: 16px under the field (its 8px + this 8px), 24px
            // above the grid. Touch tablet: fills the rest of the row.
            mt: { xs: 1, sm: 0 },
            mb: { xs: 3, sm: 0 },
            [touchTabletMedia]: { flex: 1, minWidth: 0 },
            "& .MuiTabs-list": { gap: 1 },
            "& .MuiTabs-scrollButtons.Mui-disabled": { opacity: 0.3 },
          }}
        >
          {categories.map((category) => (
            <Tab
              key={category.key}
              value={category.key}
              disableRipple
              label={
                <Typography
                  variant="body2"
                  component="span"
                  sx={{ fontWeight: 600, whiteSpace: "nowrap" }}
                >
                  {category.label}
                </Typography>
              }
              ref={(el) => {
                tabRefs.current[category.key] = el;
              }}
              sx={(theme) => ({
                minHeight: 44,
                minWidth: "auto",
                maxWidth: "none",
                px: 2,
                py: 0,
                textTransform: "none",
                color: "text.primary",
                // The focus ring sits just outside the pill.
                overflow: "visible",
                // Its own stacking context, so the pill (z -1) paints
                // behind the label but in front of the bar's background.
                isolation: "isolate",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: theme.spacing(0.5, 0),
                  zIndex: -1,
                  borderRadius: 999,
                  border: "1px solid",
                  borderColor: theme.palette.inputBorder,
                  bgcolor: "background.paper",
                  transition:
                    "background-color 150ms ease, border-color 150ms ease",
                },
                "&.Mui-selected": { color: "primary.contrastText" },
                "&.Mui-selected::before": {
                  bgcolor: "primary.main",
                  borderColor: "primary.main",
                },
                "&.Mui-focusVisible::before": {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              })}
            />
          ))}
        </Tabs>
      </Box>

      <Box
        ref={gridRef}
        sx={{
          // No min width of its own: the grid fits whatever the page's
          // content column is (288px at a 320px screen).
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
          // Touch tablets: as many compact cards (MenuCard compact) as
          // the width allows, each ≥ TOUCH_CARD_MIN_PX — 1180px landscape:
          // 4 × ~267px; 1280px: 5 × ~214px; 800px portrait: 3 × ~235px.
          [touchTabletMedia]: {
            gridTemplateColumns: `repeat(auto-fill, minmax(${TOUCH_CARD_MIN_PX}px, 1fr))`,
            gap: TOUCH_CARD_GAP,
            p: 1,
          },
          // Portrait: 3 smaller columns from a ~710px screen up.
          [touchTabletPortraitMedia]: {
            gridTemplateColumns: `repeat(auto-fill, minmax(${TOUCH_PORTRAIT_CARD_MIN_PX}px, 1fr))`,
          },
          // Cards fill their cell height (see MenuCard) so every card
          // in a row lines up.
          alignItems: "stretch",
        }}
      >
        {visibleMenus.map((menu) => (
          <MenuCard
            key={menu.id}
            item={{
              // Shop data in the customer's language (English when no
              // Myanmar text — lib/i18n/localizedText).
              name: localizedText(locale, menu.name, menu.nameMy),
              description: localizedText(locale, menu.description, menu.descriptionMy),
              price: menu.price,
              category: menu.categories.join(", "),
              imageUrl: menu.imageUrl,
              stockQuantity: menu.stockQuantity,
              isAvailable: menu.isAvailable,
            }}
            onAddToCart={() => setDetailMenuId(menu.id)}
            compact
            labels={cardLabels}
          />
        ))}
      </Box>

      <MenuDetailDialog
        open={detailMenuId !== null}
        menuId={detailMenuId}
        locationId={locationId}
        canOrder={canOrder}
        onClose={() => setDetailMenuId(null)}
        onSubmit={async (menuId, quantity, addonIds, note, detail) => {
          const menu = menus.find((item) => item.id === menuId);
          if (!menu) return t("itemUnavailable");
          return onAddToCart(menu, quantity, addonIds, note, detail);
        }}
      />
    </>
  );
}
