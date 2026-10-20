"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Skeleton,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import { useDebouncedValue } from "@/app/lib/hooks/useDebouncedValue";
import MenuCard from "@/app/components/MenuCard";
import { langAttr, type AppLocale } from "@/app/lib/i18n/locale";
import { myanmarWordsOrNull } from "@/app/lib/i18n/customerWords";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { matchesMenuSearch } from "@/app/lib/storefront/menuSearch";
import { orderableFirst } from "@/app/lib/menu/orderableFirst";
import { touchTabletMedia } from "@/app/lib/theme/sharedThemeTokens";

/** What MenuCard needs, plus what the grid filters and adds by. */
export interface StaffMenu {
  id: number;
  name: string;
  /** Myanmar names for the menu side's မြန်မာ view (null = none: the
   *  English shows). */
  nameMy: string | null;
  description: string;
  descriptionMy: string | null;
  /** Today's price, for browsing. */
  price: number;
  imageUrl: string | null;
  /** Its visible categories' ids, and their names (for the card). */
  categoryIds: number[];
  categoryNames: string[];
  stockQuantity: number;
  /** Not switched off by staff — MenuCard also needs stock > 0. */
  isAvailable: boolean;
  /** Tapping it opens MenuDetailDialog instead of adding right away. */
  hasAddonGroups: boolean;
}

export interface StaffCategory {
  id: number;
  name: string;
  nameMy?: string | null;
}

const ALL = "all" as const;

/** Touch tablets: as many compact cards as the menu side's width allows,
 *  each at least this wide (auto-fill + minmax, never a fixed count), so
 *  the columns follow the sidebar (expanded / rail) and the order panel —
 *  e.g. 1180px landscape: 4 (5 with the rail); 800px portrait: 2 (3). */
const TOUCH_CARD_MIN_PX = 176;

/** The grid's columns — the cards and their placeholders alike. */
const gridSx = {
  display: "grid",
  // Phones: 2 columns. From sm: as many 150–200px cards as fit —
  // 3–4 on tablets, 5–7 on wide desktops beside the order panel.
  gridTemplateColumns: {
    xs: "repeat(2, 1fr)",
    sm: "repeat(auto-fill, minmax(150px, 200px))",
  },
  gap: 1.5,
  alignItems: "stretch",
  // Touch tablets: compact cards (MenuCard compact), ≥ TOUCH_CARD_MIN_PX
  // each, with the same 12px gap.
  [touchTabletMedia]: {
    gridTemplateColumns: `repeat(auto-fill, minmax(${TOUCH_CARD_MIN_PX}px, 1fr))`,
  },
} as const;

/** A loading card. Laptops / phones: the card-shaped block as always.
 *  Touch tablets: the compact card's proportions (the 16:9 photo, the
 *  name line and the 32px price row in 4px padding), so nothing jumps
 *  once the language is read. One of the two is display none, so each
 *  placeholder takes ONE grid cell. */
function CardSkeleton() {
  return (
    <>
      <Skeleton
        variant="rounded"
        sx={{
          height: "auto",
          aspectRatio: "0.95",
          [touchTabletMedia]: { display: "none" },
        }}
      />
      <Box
        sx={{
          display: "none",
          border: 1,
          borderColor: "divider",
          borderRadius: 3,
          p: 0.5,
          [touchTabletMedia]: { display: "block" },
        }}
      >
        <Skeleton
          variant="rounded"
          sx={{ height: "auto", aspectRatio: "16 / 9", borderRadius: 2 }}
        />
        <Box sx={{ px: 1, py: 0.5 }}>
          <Skeleton variant="rounded" sx={{ width: "70%", height: 20 }} />
          <Skeleton variant="rounded" sx={{ width: "50%", height: 32 }} />
        </Box>
      </Box>
    </>
  );
}

/**
 * The New Order page's left side: search, category chips ("All" first,
 * then the categories in the server's order — never re-sorted) and the
 * menu grid. What a tap on a card does is the parent's call (onSelect).
 *
 * `language` is the menu side's EN | မြန်မာ view (names, chips, the
 * card's price and Add words) — null until this device's choice is read,
 * when chips and cards hold their space as placeholders so the other
 * language never flashes. The search matches BOTH names either way.
 */
export default function StaffMenuGrid({
  menus,
  categories,
  language,
  onSelect,
}: {
  menus: StaffMenu[];
  categories: StaffCategory[];
  language: AppLocale | null;
  onSelect: (menu: StaffMenu) => void;
}) {
  // Myanmar: the customer's own words (lib/i18n/customerWords); English:
  // the card's Backoffice defaults ("MMK", the + icon).
  const myanmar = myanmarWordsOrNull(language);
  const t = useTranslations("bo.newOrder");
  const tOrders = useTranslations("bo.orders");
  const theme = useTheme();
  // lg: where the page shows the current order beside the menus.
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 200);
  const [activeCategory, setActiveCategory] = useState<number | typeof ALL>(
    ALL,
  );

  // Desktop: ready to type straight away. Once, on the first render
  // that knows the width — a later resize doesn't steal focus.
  const searchRef = useRef<HTMLInputElement>(null);
  const hasAutoFocused = useRef(false);
  useEffect(() => {
    if (isDesktop && !hasAutoFocused.current) {
      hasAutoFocused.current = true;
      searchRef.current?.focus();
    }
  }, [isDesktop]);

  // Filtered by category and search first, then the orderable menus
  // before the sold-out / switched-off ones (lib/menu/orderableFirst —
  // as the customer menu).
  const visibleMenus = useMemo(() => {
    return orderableFirst(
      menus.filter(
        (menu) =>
          (activeCategory === ALL || menu.categoryIds.includes(activeCategory)) &&
          // Both names, whichever language is shown (as the customer menu).
          matchesMenuSearch(menu, debouncedSearch),
      ),
    );
  }, [menus, activeCategory, debouncedSearch]);

  const chips: { value: number | typeof ALL; label: string }[] = [
    { value: ALL, label: myanmar?.allCategories ?? tOrders("all") },
    ...categories.map((category) => ({
      value: category.id,
      label: localizedText(language ?? "en", category.name, category.nameMy),
    })),
  ];

  return (
    <Box>
      <TextField
        inputRef={searchRef}
        size="small"
        label={t("searchMenus")}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: search && (
              <InputAdornment position="end">
                <IconButton
                  aria-label={t("clearSearch")}
                  onClick={() => setSearch("")}
                  sx={{ width: 44, height: 44, mr: -1 }}
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      {/* One sideways-scrolling row, like the customer menu's tabs. */}
      <Stack
        role="group"
        aria-label={t("categoryFilter")}
        direction="row"
        spacing={1}
        sx={{
          mt: 1.5,
          mb: 2,
          py: 0.5,
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {language === null
          ? [0, 1, 2, 3].map((placeholder) => (
              <Skeleton
                key={placeholder}
                variant="rounded"
                aria-hidden
                sx={{ flexShrink: 0, width: 88, height: 44, borderRadius: 999 }}
              />
            ))
          : chips.map((chip) => {
          const selected = chip.value === activeCategory;
          return (
            <Chip
              key={chip.value}
              clickable
              aria-pressed={selected}
              color={selected ? "primary" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() => setActiveCategory(chip.value)}
              label={
                <Typography
                  variant="body2"
                  component="span"
                  lang={langAttr(language)}
                >
                  {chip.label}
                </Typography>
              }
              sx={{ flexShrink: 0, minHeight: 44, borderRadius: 999 }}
            />
          );
            })}
      </Stack>

      {language === null ? (
        <Box aria-hidden sx={gridSx}>
          {Array.from({ length: 8 }, (_, placeholder) => (
            <CardSkeleton key={placeholder} />
          ))}
        </Box>
      ) : visibleMenus.length === 0 ? (
        <Stack
          spacing={1}
          sx={{
            alignItems: "center",
            textAlign: "center",
            py: 6,
            px: 2,
            border: 1,
            borderStyle: "dashed",
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <SearchOffIcon fontSize="large" sx={{ color: "text.secondary" }} />
          <Typography variant="body1">
            {debouncedSearch.trim()
              ? t("noMatch", { search: debouncedSearch.trim() })
              : t("noMenusInCategory")}
          </Typography>
          {search && (
            <Button onClick={() => setSearch("")} sx={{ minHeight: 44 }}>
              {t("clearSearch")}
            </Button>
          )}
        </Stack>
      ) : (
        <Box sx={gridSx} lang={langAttr(language)}>
          {visibleMenus.map((menu) => (
            <MenuCard
              key={menu.id}
              item={{
                name: localizedText(language, menu.name, menu.nameMy),
                description: localizedText(
                  language,
                  menu.description,
                  menu.descriptionMy,
                ),
                price: menu.price,
                category: menu.categoryNames.join(", "),
                imageUrl: menu.imageUrl,
                stockQuantity: menu.stockQuantity,
                isAvailable: menu.isAvailable,
              }}
              showDescription={false}
              // Touch tablets: the 16:9 photo, so 4 columns fit.
              compact
              // မြန်မာ: "3,500 ကျပ်" and the "ထည့်မယ်" Add, as customers
              // see it; EN: the card's own defaults.
              labels={myanmar?.cardLabels}
              // The card's own disabled state covers out-of-stock menus.
              onAddToCart={() => onSelect(menu)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
