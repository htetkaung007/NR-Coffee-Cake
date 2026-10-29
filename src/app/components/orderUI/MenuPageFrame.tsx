"use client";

import type { ReactNode } from "react";
import { Box } from "@mui/material";
import {
  barClearanceSx,
  railClearanceSx,
} from "@/app/lib/storefront/bottomBarLayout";
import {
  touchTabletMedia,
  touchTabletPortraitMedia,
} from "@/app/lib/theme/sharedThemeTokens";
import type { getOrderPageBackground } from "@/app/lib/theme/orderPageBackground";

/**
 * The /menu page's frame, shared by the Counter / Online menu
 * (CounterOrderClient) and the Table menu (TableOrderClient): the page
 * background, the floating bottom bar's room at the end (so the last
 * card scrolls clear of it), the top bar, then the content centred at
 * 1200px — kept clear of the right-side rail on a landscape touch
 * screen (bottomBarLayout).
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
      sx={[
        {
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: background.color,
          backgroundImage: background.image,
          backgroundAttachment: "fixed",
        },
        barClearanceSx,
      ]}
    >
      {topBar}
      <Box
        sx={[
          {
            flex: 1,
            width: "100%",
            p: { xs: 2, sm: 3 },
            // 16px under the top bar on a touch tablet — part of the
            // height budget that keeps two rows of cards in view there.
            [touchTabletMedia]: { pt: 2 },
            // Portrait touch tablet: 16px sides too (not 24px) — room for
            // the 3 menu columns on a ~600px-wide tablet.
            [touchTabletPortraitMedia]: { px: 2 },
            maxWidth: 1200,
            mx: "auto",
          },
          railClearanceSx,
        ]}
      >
        {children}
      </Box>
    </Box>
  );
}
