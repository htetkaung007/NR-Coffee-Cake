"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
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

/** What MenuCard needs, plus what the grid filters and adds by. */
export interface StaffMenu {
  id: number;
  name: string;
  description: string;
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
}

const ALL = "all" as const;

/**
 * The New Order page's left side: search, category chips ("All" first,
 * then the categories in the server's order — never re-sorted) and the
 * menu grid. What a tap on a card does is the parent's call (onSelect).
 */
export default function StaffMenuGrid({
  menus,
  categories,
  onSelect,
}: {
  menus: StaffMenu[];
  categories: StaffCategory[];
  onSelect: (menu: StaffMenu) => void;
}) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));
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

  const visibleMenus = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    return menus.filter(
      (menu) =>
        (activeCategory === ALL || menu.categoryIds.includes(activeCategory)) &&
        (term === "" || menu.name.toLowerCase().includes(term)),
    );
  }, [menus, activeCategory, debouncedSearch]);

  const chips: { value: number | typeof ALL; label: string }[] = [
    { value: ALL, label: "All" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.name,
    })),
  ];

  return (
    <Box>
      <TextField
        inputRef={searchRef}
        size="small"
        label="Search menus"
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
                  aria-label="Clear search"
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
        aria-label="Filter by category"
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
        {chips.map((chip) => {
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
                <Typography variant="body2" component="span">
                  {chip.label}
                </Typography>
              }
              sx={{ flexShrink: 0, minHeight: 44, borderRadius: 999 }}
            />
          );
        })}
      </Stack>

      {visibleMenus.length === 0 ? (
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
              ? `No menus match “${debouncedSearch.trim()}”`
              : "No menus in this category"}
          </Typography>
          {search && (
            <Button onClick={() => setSearch("")} sx={{ minHeight: 44 }}>
              Clear search
            </Button>
          )}
        </Stack>
      ) : (
        <Box
          sx={{
            display: "grid",
            // Phones: 2 columns. From sm: as many 150–200px cards as fit —
            // 3–4 on tablets, 5–7 on wide desktops beside the order panel.
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(auto-fill, minmax(150px, 200px))",
            },
            gap: 1.5,
            alignItems: "stretch",
          }}
        >
          {visibleMenus.map((menu) => (
            <MenuCard
              key={menu.id}
              item={{
                name: menu.name,
                description: menu.description,
                price: menu.price,
                category: menu.categoryNames.join(", "),
                imageUrl: menu.imageUrl,
                stockQuantity: menu.stockQuantity,
                isAvailable: menu.isAvailable,
              }}
              showDescription={false}
              // The card's own disabled state covers out-of-stock menus.
              onAddToCart={() => onSelect(menu)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
