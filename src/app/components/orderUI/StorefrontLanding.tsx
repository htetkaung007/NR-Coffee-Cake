"use client";

import Link from "next/link";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useTranslations } from "next-intl";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import {
  ORDER_PAGE_MIN_WIDTH,
  getOrderPageBackground,
} from "@/app/lib/theme/orderPageBackground";
import { shopInitials } from "@/app/lib/storefront/shopInitials";
import LanguageSwitch from "./LanguageSwitch";

/**
 * The landing page (`/`) for customers: the shop's badge + name, a
 * "View menu" row for each location whose online menu a visitor may see
 * (lib/storefront/landingLocations), and always the hint that ordering
 * needs the QR in the shop. Nothing about the Backoffice — staff open
 * /backoffice directly. No bottom bar (not a tab page).
 */
export default function StorefrontLanding({
  shopName,
  locations,
}: {
  /** Shop data — never translated. */
  shopName: string | null;
  locations: { id: number; name: string }[];
}) {
  const t = useTranslations("landing");
  const pageBackground = getOrderPageBackground(useTheme());
  const initials = shopInitials(shopName);

  return (
    <Box
      component="main"
      sx={{
        minWidth: ORDER_PAGE_MIN_WIDTH,
        minHeight: "100dvh",
        px: 2,
        pt: "calc(8px + env(safe-area-inset-top, 0px))",
        pb: "calc(24px + env(safe-area-inset-bottom, 0px))",
        backgroundColor: pageBackground.color,
        backgroundImage: pageBackground.image,
        backgroundAttachment: "fixed",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <LanguageSwitch />
      </Box>

      <Box
        sx={{
          maxWidth: 480,
          mx: "auto",
          mt: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 3,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1.5,
            maxWidth: "100%",
          }}
        >
          {initials && (
            <Box
              aria-hidden
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              <Typography component="span" variant="h5">
                {initials}
              </Typography>
            </Box>
          )}
          <Typography
            variant="h5"
            component="h1"
            sx={{ overflowWrap: "anywhere" }}
          >
            {shopName ?? "Café Maw"}
          </Typography>
        </Box>

        {locations.length > 0 && (
          <Box
            component="ul"
            aria-label={t("menusLabel")}
            sx={{
              listStyle: "none",
              m: 0,
              p: 0,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            {locations.map((location) => (
              <Box
                component="li"
                key={location.id}
                sx={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  p: 1.5,
                  pl: 2,
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  textAlign: "start",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{ flex: "1 1 8rem", minWidth: 0, overflowWrap: "anywhere" }}
                >
                  {location.name}
                </Typography>
                <Button
                  component={Link}
                  href={`/menu?locationId=${location.id}`}
                  variant="contained"
                  aria-label={t("viewMenuAt", { name: location.name })}
                  sx={{ minHeight: 44, flexShrink: 0 }}
                >
                  {t("viewMenu")}
                </Button>
              </Box>
            ))}
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "text.secondary",
            textAlign: "start",
          }}
        >
          <QrCodeScannerIcon aria-hidden sx={{ flexShrink: 0 }} />
          <Typography variant="body2">{t("orderHint")}</Typography>
        </Box>
      </Box>
    </Box>
  );
}
