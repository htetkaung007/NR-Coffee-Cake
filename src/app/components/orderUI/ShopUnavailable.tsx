"use client";

import Link from "next/link";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useTranslations } from "next-intl";
import LocalCafeOutlinedIcon from "@mui/icons-material/LocalCafeOutlined";
import LinkOffIcon from "@mui/icons-material/LinkOff";
import { getOrderPageBackground } from "@/app/lib/theme/orderPageBackground";
import type { MenuAccessResult } from "@/app/lib/storefront/menuAccessCheck";
import { HideBottomBar } from "./OrderBotBar";

/**
 * What a customer page shows when the menu may not be seen
 * (lib/storefront/menuAccess), with no menu data at all — and words for
 * WHY, so an open shop never reads as closed:
 *  - "onlineMenuOff": the shop is open, its online menu is off — a
 *    friendly café screen ("Our menu is in the café") with the
 *    location's name; the way in is scanning a QR in the shop;
 *  - "locationUnavailable": the location is missing or archived — the
 *    link is dead; a link to the landing page ("/") lists the menus that
 *    are online.
 */
export default function ShopUnavailable({
  refusal,
}: {
  refusal: Exclude<MenuAccessResult, { access: "menu" }>;
}) {
  const t = useTranslations("shop");
  const pageBackground = getOrderPageBackground(useTheme());

  return (
    <Box
      component="main"
      sx={{
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
      {/* Its own way on (or none) — no bottom bar. */}
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
          minWidth: 0,
        }}
      >
        {refusal.access === "onlineMenuOff" ? (
          <>
            <LocalCafeOutlinedIcon
              fontSize="large"
              aria-hidden
              sx={{ color: "primary.main" }}
            />
            {/* Shop data — the location's name, never translated. */}
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ overflowWrap: "anywhere" }}
            >
              {refusal.shopName}
            </Typography>
            <Typography variant="h6" component="h1">
              {t("menuInCafeTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("menuInCafeHint")}
            </Typography>
          </>
        ) : (
          <>
            <LinkOffIcon
              fontSize="large"
              aria-hidden
              sx={{ color: "text.secondary" }}
            />
            <Typography variant="h6" component="h1">
              {t("linkGoneTitle")}
            </Typography>
            <Button
              component={Link}
              href="/"
              variant="contained"
              sx={{ mt: 1, minHeight: 44 }}
            >
              {t("seeOurMenus")}
            </Button>
          </>
        )}
      </Box>
    </Box>
  );
}
