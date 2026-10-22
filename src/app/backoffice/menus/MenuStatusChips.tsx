"use client";

import Link from "next/link";
import { Chip, Stack } from "@mui/material";
import { useTranslations } from "next-intl";
import {
  MENU_STATUS_FILTERS,
  type MenuStatusFilter,
} from "@/app/lib/menu/menuStatusFilter";

/** Each filter's word (bo.menus) — the cards' own words for sold out. */
const FILTER_WORDS = {
  all: "filterAll",
  soldOut: "soldOut",
  unavailable: "filterOff",
} as const satisfies Record<MenuStatusFilter, string>;

/** Each filter's URL — "all" is the bare page. */
function filterHref(filter: MenuStatusFilter) {
  return filter === "all" ? "/backoffice/menus" : `/backoffice/menus?status=${filter}`;
}

/**
 * [All (12)] [Sold out (3)] [Off (1)] — the Menus page's status filter:
 * links (the filter lives in the URL, ?status=), the selected one filled
 * primary with aria-current="page", the count part of each name and
 * shown even at 0. The words carry the meaning, never colour. One row
 * that scrolls sideways inside itself when it's wider than the screen.
 */
export default function MenuStatusChips({
  selected,
  counts,
}: {
  selected: MenuStatusFilter;
  counts: Record<MenuStatusFilter, number>;
}) {
  const t = useTranslations("bo.menus");
  return (
    <Stack
      component="nav"
      aria-label={t("filterLabel")}
      direction="row"
      spacing={1}
      sx={{
        mb: 2,
        minWidth: 0,
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {MENU_STATUS_FILTERS.map((filter) => {
        const isSelected = filter === selected;
        return (
          <Chip
            key={filter}
            component={Link}
            href={filterHref(filter)}
            clickable
            aria-current={isSelected ? "page" : undefined}
            color={isSelected ? "primary" : "default"}
            variant={isSelected ? "filled" : "outlined"}
            label={t("filterChip", { label: t(FILTER_WORDS[filter]), count: counts[filter] })}
            sx={{ flexShrink: 0, minHeight: 44, borderRadius: 999 }}
          />
        );
      })}
    </Stack>
  );
}
