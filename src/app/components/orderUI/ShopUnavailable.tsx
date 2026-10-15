"use client";

import { Box, Typography, useTheme } from "@mui/material";
import { useTranslations } from "next-intl";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import {
  ORDER_PAGE_MIN_WIDTH,
  getOrderPageBackground,
} from "@/app/lib/theme/orderPageBackground";
import { HideBottomBar } from "./OrderBotBar";

/**
 * What a customer page shows when the menu may not be seen
 * (lib/storefront/menuAccess → "unavailable"): the online menu is off
 * and this browser has no QR session here, or the location is missing
 * or closed — the same screen for every case, and no menu data at all.
 */
export default function ShopUnavailable() {
  const t = useTranslations("shop");
  const pageBackground = getOrderPageBackground(useTheme());

  return (
    <Box
      component="main"
      sx={{
        minWidth: ORDER_PAGE_MIN_WIDTH,
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 2,
        pt: "calc(16px + env(safe-area-inset-top, 0px))",
        pb: "calc(16px + env(safe-area-inset-bottom, 0px))",
        backgroundColor: pageBackground.color,
        backgroundImage: pageBackground.image,
        backgroundAttachment: "fixed",
      }}
    >
      {/* A dead end with nothing to navigate to — no bottom bar. */}
      <HideBottomBar />
      <Box
        role="status"
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 1,
          maxWidth: 360,
        }}
      >
        <StorefrontOutlinedIcon
          fontSize="large"
          aria-hidden
          sx={{ color: "text.secondary" }}
        />
        <Typography variant="h6" component="h1">
          {t("unavailableTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t("unavailableHint")}
        </Typography>
      </Box>
    </Box>
  );
}
