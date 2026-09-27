"use client";

import { Box } from "@mui/material";
import { topBarHeight } from "@/app/lib/theme/sharedThemeTokens";

/**
 * Wide screens only (from `showFrom` up): a right-hand column that stays
 * in view while the page's main column scrolls — the order detail
 * page's bill, the New Order page's current order. Capped at the
 * viewport's height; the content inside scrolls its own middle part
 * and keeps its footer (total + main action) pinned at the bottom.
 * Below `showFrom` the same content opens in OrderPanelDrawer from
 * OrderBottomBar instead.
 */
export default function OrderSidePanel({
  label,
  showFrom,
  width,
  fullHeight = false,
  children,
}: {
  /** Accessible name of the region, e.g. "Bill", "Current order". */
  label: string;
  showFrom: "md" | "lg";
  width: number | Partial<Record<"md" | "lg" | "xl", number>>;
  /** Always as tall as the viewport allows (not just its content), so
   *  its footer sits at the bottom even with nothing in it yet. */
  fullHeight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Box
      component="aside"
      aria-label={label}
      sx={(theme) => {
        const top = `calc(${topBarHeight(theme)}px + ${theme.spacing(2)})`;
        return {
          display: { xs: "none", [showFrom]: "flex" },
          flexDirection: "column",
          width,
          flexShrink: 0,
          position: "sticky",
          top,
          [fullHeight ? "height" : "maxHeight"]:
            `calc(100vh - ${top} - ${theme.spacing(2)})`,
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        };
      }}
    >
      {children}
    </Box>
  );
}
