"use client";

import { useMemo, useState } from "react";
import { Box, InputAdornment, Tab, Tabs, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import MenuDetailDialog from "./MenuDetailDialog";
import OdMenuCard from "../OdMenuCard";

export interface MenuOption {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  imageUrl: string | null;
  stockQuantity: number;
  isAvailable: boolean;
}

/** "All" is a synthetic tab, never a real category name from the DB —
 *  kept as a constant so the comparison below can't drift out of sync
 *  with the Tab's own value. */
const ALL_CATEGORIES = "All";

/** Design mock: up to 5 category tabs fit without scrolling; beyond
 *  that MUI's Tabs switches to horizontal scroll (variant="scrollable"
 *  already scrolls at any count — this just decides when to show the
 *  scroll affordance vs a plain evenly-spaced row). */
const MAX_TABS_BEFORE_SCROLL = 5;

interface MenuBrowserProps {
  menus: MenuOption[];
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
    menu: { id: number; name: string; price: number },
    quantity: number,
    addonIds: number[],
  ) => Promise<string | null>;
}

/** Matches MUI's default Toolbar height (theme.mixins.toolbar) so the
 *  sticky search/category bar picks up exactly where OrderTopBar's
 *  own sticky AppBar ends, instead of overlapping under it or leaving
 *  a gap above it. */
const TOPBAR_HEIGHT = { xs: 56, sm: 64 };

/**
 * Browsing surface only: search box, category tabs, the OdMenuCard
 * grid, and the detail dialog a card click opens. Cart contents and
 * the order-submit flow live outside this component (on their own
 * /cart route — see cart/page.tsx) — this is "pick something to add",
 * not "what's already in the cart".
 */
export default function MenuBrowser({
  menus,
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

  const categories = useMemo(
    () => [
      ALL_CATEGORIES,
      ...Array.from(new Set(menus.map((m) => m.category))),
    ],
    [menus],
  );

  const visibleMenus = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return menus.filter((menu) => {
      const matchesCategory =
        activeCategory === ALL_CATEGORIES || menu.category === activeCategory;
      const matchesSearch =
        term.length === 0 || menu.name.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [menus, activeCategory, searchTerm]);

  return (
    <>
      {/* Sticky search bar + category tabs — stay pinned together as
         the customer scrolls down the grid, per the design mock. */}
      <Box
        sx={{
          position: "sticky",
          top: TOPBAR_HEIGHT,
          zIndex: 3,
          bgcolor: backgroundColor,
          backgroundImage,
          backgroundAttachment,
          pt: 1,
          mb: 3,
        }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Search Menus"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            mb: 2,
            borderRadius: 3,
            "& .MuiOutlinedInput-root": { borderRadius: 3 },
            "& .MuiOutlinedInput-input": {
              py: { xs: 0.75, sm: 1, md: 1.25, lg: 1.25 },
            },
          }}
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

        {/* Category tabs — auto-switches to scrollable once there are
           more than MAX_TABS_BEFORE_SCROLL categories (design mock's
           "up to 5, then side-by-side scroll" note). */}
        <Tabs
          value={activeCategory}
          onChange={(_, value) => setActiveCategory(value)}
          variant={
            categories.length > MAX_TABS_BEFORE_SCROLL ? "scrollable" : "standard"
          }
          scrollButtons={
            categories.length > MAX_TABS_BEFORE_SCROLL ? "auto" : false
          }
          allowScrollButtonsMobile
          sx={{ minHeight: 36 }}
        >
          {categories.map((category) => (
            <Tab
              key={category}
              value={category}
              label={category}
              sx={{ minHeight: 36 }}
            />
          ))}
        </Tabs>
      </Box>

      <Box
        sx={{
          minWidth: 320,
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
            lg: "repeat(4, 1fr)",
          },
          gap: { xs: 2, sm: 2, md: 2.5 },
          p: { xs: 1, sm: 1, md: 3 },
          alignItems: "start",
        }}
      >
        {visibleMenus.map((menu) => (
          <OdMenuCard
            key={menu.id}
            item={{
              name: menu.name,
              description: menu.description,
              price: menu.price,
              category: menu.category,
              imageUrl: menu.imageUrl,
              stockQuantity: menu.stockQuantity,
              isAvailable: menu.isAvailable,
            }}
            onAddToCart={() => setDetailMenuId(menu.id)}
          />
        ))}
      </Box>

      <MenuDetailDialog
        open={detailMenuId !== null}
        menuId={detailMenuId}
        locationId={locationId}
        canOrder={canOrder}
        onClose={() => setDetailMenuId(null)}
        onSubmit={async (menuId, quantity, addonIds) => {
          const menu = menus.find((item) => item.id === menuId);
          if (!menu) return "This item is no longer available.";
          return onAddToCart(menu, quantity, addonIds);
        }}
      />
    </>
  );
}
