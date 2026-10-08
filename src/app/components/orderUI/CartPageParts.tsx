"use client";

import type { ReactNode } from "react";
import { Box, Button } from "@mui/material";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

/** The cart pages' frame (Counter: CartPageClient; Table:
 *  TableCartPageClient) — full height, content centred at 720px, the
 *  list panel taking the remaining height. */
export function CartPageShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
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
      Add More
    </Button>
  );
}
