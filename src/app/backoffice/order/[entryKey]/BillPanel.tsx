"use client";

import { Box } from "@mui/material";
import { topBarHeight } from "@/app/lib/theme/sharedThemeTokens";

const PANEL_WIDTH = 360;

/**
 * Wide screens only (lg+): the bill as a right-hand column that stays
 * in view while the timeline scrolls. Capped at the viewport's height —
 * BillContent then scrolls its lines inside and keeps the total and
 * Mark as paid pinned at the bottom.
 */
export default function BillPanel({ children }: { children: React.ReactNode }) {
  return (
    <Box
      component="aside"
      aria-label="Bill"
      sx={(theme) => {
        const top = `calc(${topBarHeight(theme)}px + ${theme.spacing(2)})`;
        return {
          display: { xs: "none", lg: "flex" },
          flexDirection: "column",
          width: PANEL_WIDTH,
          flexShrink: 0,
          position: "sticky",
          top,
          maxHeight: `calc(100vh - ${top} - ${theme.spacing(2)})`,
          overflow: "hidden",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.default",
        };
      }}
    >
      {children}
    </Box>
  );
}
