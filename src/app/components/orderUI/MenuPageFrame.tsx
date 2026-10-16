"use client";

import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { BOTTOM_BAR_CLEARANCE } from "@/app/lib/storefront/bottomBarLayout";
import {
  ORDER_PAGE_MIN_WIDTH,
  type getOrderPageBackground,
} from "@/app/lib/theme/orderPageBackground";

/**
 * The /menu page's frame, shared by the Counter / Online menu
 * (CounterOrderClient) and the Table menu (TableOrderClient): the page
 * background, the floating bottom bar's room at the end (so the last
 * card scrolls clear of it), the top bar, then the content centred at
 * 1200px.
 */
export default function MenuPageFrame({
  background,
  topBar,
  children,
}: {
  /** getOrderPageBackground(theme) — the same one MenuBrowser's sticky
   *  bar blends into. */
  background: ReturnType<typeof getOrderPageBackground>;
  topBar: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        minWidth: ORDER_PAGE_MIN_WIDTH,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        pb: BOTTOM_BAR_CLEARANCE,
        backgroundColor: background.color,
        backgroundImage: background.image,
        backgroundAttachment: "fixed",
      }}
    >
      {topBar}
      <Box
        sx={{
          flex: 1,
          width: "100%",
          p: { xs: 2, sm: 3 },
          maxWidth: 1200,
          mx: "auto",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
