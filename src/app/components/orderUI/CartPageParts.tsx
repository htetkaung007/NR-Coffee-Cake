"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { useCustomerPrice } from "@/app/lib/hooks/useCustomerPrice";
import BackCircleButton from "./BackCircleButton";
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

/** A cart page's header: back to the menu, the page's title, and the
 *  shop's name under it. */
export function CartPageHeader({
  title,
  shopName,
  onBack,
}: {
  title: string;
  shopName: string | null;
  onBack: () => void;
}) {
  const tCommon = useTranslations("common");
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
      <BackCircleButton ariaLabel={tCommon("backToMenu")} onClick={onBack} />
      <Stack>
        <Typography variant="h6">{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {shopName ?? "Café Maw"}
        </Typography>
      </Stack>
    </Stack>
  );
}

/** The footer's hairline and "Total price … amount" row. */
export function CartTotalRow({
  amount,
  mb,
}: {
  amount: number;
  /** Space under the row (theme spacing). */
  mb?: number;
}) {
  const tCommon = useTranslations("common");
  const { price } = useCustomerPrice();
  return (
    <>
      <Divider sx={{ mb: 1.5 }} />
      <Stack direction="row" sx={{ justifyContent: "space-between", mb }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {tCommon("totalPrice")}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {price(amount)}
        </Typography>
      </Stack>
    </>
  );
}
