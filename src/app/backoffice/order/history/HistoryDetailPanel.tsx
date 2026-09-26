"use client";

import { Box } from "@mui/material";
import { topBarHeight } from "@/app/lib/theme/sharedThemeTokens";

const PANEL_WIDTH = 420;

/**
 * lg+ only: the selected row's detail as the page's right-hand column,
 * full height of the content area (from right below the fixed top bar
 * to the bottom of the viewport) — a plain left divider, not a
 * floating card with its own border/radius/shadow (the left column,
 * a flex sibling, determines the row's actual height; this just
 * stretches to match it and stays pinned while that column scrolls).
 */
export default function HistoryDetailPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Box
      component="aside"
      aria-label="Details"
      sx={(theme) => {
        const top = topBarHeight(theme);
        return {
          display: { xs: "none", lg: "flex" },
          flexDirection: "column",
          width: PANEL_WIDTH,
          flexShrink: 0,
          position: "sticky",
          top,
          maxHeight: `calc(100vh - ${top}px)`,
          overflow: "hidden",
          borderLeft: 1,
          borderColor: "divider",
        };
      }}
    >
      {children}
    </Box>
  );
}
