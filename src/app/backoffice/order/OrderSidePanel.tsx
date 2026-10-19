"use client";

import { Box } from "@mui/material";
import { topBarHeight } from "@/app/lib/theme/sharedThemeTokens";

const cardSx = {
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.paper",
} as const;

/**
 * Wide screens only (from `showFrom` up): a right-hand column that stays
 * in view while the page's main column scrolls — the order detail
 * page's bill, the New Order page's current order. Capped at the
 * viewport's height; the content inside scrolls its own middle part
 * and keeps its footer (total + main action) pinned at the bottom.
 * `above` is an optional separate card on top of it (same width, a gap
 * between) — e.g. New Order's "Order for" picker — sticky with it.
 * Below `showFrom` the same content opens in SidePanelDrawer from
 * OrderBottomBar instead.
 */
export default function OrderSidePanel({
  label,
  showFrom,
  width,
  fullHeight = false,
  above,
  children,
}: {
  /** Accessible name of the region, e.g. "Bill", "Current order". */
  label: string;
  showFrom: "md" | "lg";
  width: number | Partial<Record<"md" | "lg" | "xl", number>>;
  /** Always as tall as the viewport allows (not just its content), so
   *  its footer sits at the bottom even with nothing in it yet. */
  fullHeight?: boolean;
  /** A card of its own above the panel (not part of its region). */
  above?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={(theme) => {
        const top = `calc(${topBarHeight(theme)}px + ${theme.spacing(2)})`;
        return {
          display: { xs: "none", [showFrom]: "flex" },
          flexDirection: "column",
          gap: 2,
          width,
          flexShrink: 0,
          position: "sticky",
          top,
          [fullHeight ? "height" : "maxHeight"]:
            `calc(100dvh - ${top} - ${theme.spacing(2)})`,
        };
      }}
    >
      {above && <Box sx={{ ...cardSx, flexShrink: 0, p: 2 }}>{above}</Box>}
      <Box
        component="aside"
        aria-label={label}
        sx={{
          ...cardSx,
          display: "flex",
          flexDirection: "column",
          // Fills the column (fullHeight) or keeps to its content, and
          // either way may shrink so only its middle scrolls.
          flex: fullHeight ? "1 1 auto" : "0 1 auto",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
