"use client";

import {
  AppBar,
  Toolbar,
  Badge,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Typography,
} from "@mui/material";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import { setLocaleAction } from "@/app/(storefront)/language/action";
import {
  LANGUAGE_NAMES,
  SHORT_LANGUAGE_NAMES,
  type AppLocale,
} from "@/app/lib/i18n/locale";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";

interface OrderTopBarProps {
  /** Company.name (the brand's shop name), not Location.name (a branch
   *  label like "Downtown") — see LocationService.getShopNameForLocation.
   *  Falls back to a generic label when a location couldn't be resolved
   *  (e.g. a bad/expired locationId). */
  shopName: string | null;
  /** Number of distinct lines in the cart — drives the small red badge
   *  on the cart icon, same as the mock's red dot. Omitted (or 0) hides
   *  the badge but the icon itself always shows. */
  cartItemCount?: number;
  /** Optional — lets the page decide what tapping the cart icon does
   *  (e.g. scroll down to the cart summary). No-op if omitted. */
  onCartClick?: () => void;
  /** True while a submitted order is waiting on counter approval — shows
   *  a small spinner beside the cart icon, so the status is visible from
   *  the menu page without a banner taking up room. */
  awaitingApproval?: boolean;
}

/**
 * Simple customer-facing header — Logo + shop name on the left, the cart
 * icon (with its item-count badge) on the right, per the design mock.
 * History is reached from OrderBotBar, not from here. Plain
 * background.paper (not primary-tinted) to match the mock's white bar,
 * distinct from Backoffice's own AppBar.
 */
/** Switches to the OTHER language — a globe and that language's short
 *  label ("EN" while the page is Myanmar, "မြန်မာ" while it's English);
 *  below 360px the globe alone (the accessible name stays). Sets the
 *  cookie, then refreshes so the server renders the page in it. Never
 *  shrinks — the shop name gives way instead. */
function LanguageSwitch() {
  const t = useTranslations("topBar");
  const router = useRouter();
  const locale = useLocale();
  const [isSaving, startSaving] = useTransition();
  const other: AppLocale = locale === "my" ? "en" : "my";

  return (
    <Button
      size="small"
      color="inherit"
      aria-label={`${t("changeLanguage")}, ${LANGUAGE_NAMES[other]}`}
      disabled={isSaving}
      onClick={() =>
        startSaving(async () => {
          await setLocaleAction(other);
          router.refresh();
        })
      }
      sx={{
        minHeight: 44,
        minWidth: 44,
        px: 1,
        gap: 0.5,
        flexShrink: 0,
        color: "text.primary",
      }}
    >
      <LanguageOutlinedIcon aria-hidden fontSize="small" />
      <Box
        component="span"
        lang={other}
        sx={(theme) => ({
          display: "none",
          [theme.breakpoints.up(360)]: { display: "inline" },
        })}
      >
        {SHORT_LANGUAGE_NAMES[other]}
      </Box>
    </Button>
  );
}

export default function OrderTopBar({
  shopName,
  cartItemCount = 0,
  onCartClick,
  awaitingApproval = false,
}: OrderTopBarProps) {
  const t = useTranslations("topBar");
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={{
        bgcolor: "background.paper",
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      {/* [shop icon + name][language][cart] — the cart and the switch
         never shrink; the shop name gives way first (ellipsis). */}
      <Toolbar sx={{ gap: 1 }}>
        <StorefrontOutlinedIcon color="primary" sx={{ flexShrink: 0 }} />
        {/* The shop's own name (never translated) — it gives way first
           (ellipsis) on a narrow phone. */}
        <Typography
          variant="h6"
          noWrap
          sx={{ flexGrow: 1, minWidth: 0, fontWeight: 700, color: "text.primary" }}
        >
          {shopName ?? "Café Maw"}
        </Typography>

        {awaitingApproval && (
          <CircularProgress
            size={18}
            thickness={5}
            aria-label={t("waitingApproval")}
          />
        )}

        <LanguageSwitch />

        <IconButton
          onClick={onCartClick}
          aria-label={t("viewCart")}
          sx={{ flexShrink: 0 }}
        >
          <Badge badgeContent={cartItemCount} color="error">
            <ShoppingCartOutlinedIcon sx={{ color: "text.primary" }} />
          </Badge>
        </IconButton>
      </Toolbar>
    </AppBar>
  );
}
