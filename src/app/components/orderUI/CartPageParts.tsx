"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Box, Button } from "@mui/material";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { BOTTOM_BAR_CLEARANCE } from "@/app/lib/storefront/bottomBarLayout";

/** The cart pages' frame (Counter: CartPageClient; Table:
 *  TableCartPageClient) — full height, content centred at 720px, the
 *  list panel taking the remaining height. Its bottom keeps the floating
 *  bottom bar's room, so the panel's Send area ends 8px above the bar
 *  (both visible; the list scrolls inside the panel, under neither). */
export function CartPageShell({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        pb: BOTTOM_BAR_CLEARANCE,
      }}
    >
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          // The clearance below already holds the 8px gap.
          pb: { xs: 0, sm: 0 },
          maxWidth: 720,
          mx: "auto",
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

/** The bordered panel holding a cart page's list (which scrolls inside
 *  it) and its footer. */
export function CartListPanel({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 1.5,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {children}
    </Box>
  );
}

/** "Add More" — back to the menu, beside the cart's main button. */
export function AddMoreButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("common");
  return (
    <Button
      variant="outlined"
      sx={{
        flex: 1,
        whiteSpace: "nowrap",
        transition: "transform 0.15s ease, background-color 0.15s ease",
        [hoverCapableMedia]: {
          "&:hover": {
            transform: "translateY(-1px)",
            bgcolor: "action.hover",
          },
        },
      }}
      onClick={onClick}
    >
      {t("addMore")}
    </Button>
  );
}
