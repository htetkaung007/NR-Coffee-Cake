"use client";

import { Box } from "@mui/material";
import { topBarHeight } from "@/app/lib/theme/sharedThemeTokens";

const cardSx = {
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
  bgcolor: "background.paper",
} as const;

export default function OrderSidePanel({
  label,
  showFrom,
  width,
  above,
  children,
}: {
  /** Accessible name of the region, e.g. "Bill", "Current order". */
  label: string;
  showFrom: "md" | "lg";
  width: number | Partial<Record<"md" | "lg" | "xl", number>>;
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
          // Keeps to its content, capped at the viewport.
          maxHeight: `calc(100dvh - ${top} - ${theme.spacing(2)})`,
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
          // Keeps to its content; once capped it shrinks, so only its
          // middle scrolls.
          flex: "0 1 auto",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
