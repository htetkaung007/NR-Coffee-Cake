"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Box, Button, Stack, Typography } from "@mui/material";
import { alpha, keyframes, type Theme } from "@mui/material/styles";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import {
  ENTRY_DETAIL_PATH,
  ORDER_LIST_PATH,
  useOrderAlerts,
} from "./OrderAlertsProvider";

// Entrance only — one-shot, transform + opacity, never looping. With
// reduced motion the global rule in globals.css collapses it.
const ENTER_MS = 200;
const bannerEnter = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
`;

/** Sticks just under the fixed top bar, whose height is the theme's
 *  toolbar mixin (it differs by breakpoint and orientation, with the
 *  media queries nested) — so every minHeight in the mixin, at any
 *  depth, becomes a `top` at the same place. */
function minHeightsToTop(style: object): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(style).map(([key, value]) => {
      if (key === "minHeight") {
        return ["top", `calc(${value}px + env(safe-area-inset-top, 0px))`];
      }
      return [
        key,
        typeof value === "object" && value !== null
          ? minHeightsToTop(value)
          : value,
      ];
    }),
  );
}

function belowTopBar(theme: Theme) {
  return minHeightsToTop(theme.mixins.toolbar);
}

/**
 * "New order waiting" bar at the top of every Backoffice page except
 * the Order List itself (which shows the orders directly). On an
 * entry's detail page, that entry's own rounds are already on screen,
 * so only OTHER entries count. No dismiss — it goes away on its own
 * once the rounds are accepted, rejected or expire. Tapping it (or its
 * Silence button, shown while the alert rings) acknowledges the alert.
 *
 * Under it, on every page but the Order List (whose bell shows its own),
 * the "Tap anywhere to enable sound" hint while the sound is on but the
 * browser still holds audio back after a reload.
 */
export default function NewOrderBanner() {
  const t = useTranslations("bo.alerts");
  const pathname = usePathname();
  const { pending, sound, alert } = useOrderAlerts();
  const isOrderList = pathname === ORDER_LIST_PATH;

  const viewingEntryKey = ENTRY_DETAIL_PATH.exec(pathname)?.[1] ?? null;
  const count = isOrderList
    ? 0
    : pending.filter((round) => round.entryKey !== viewingEntryKey).length;

  return (
    // The live region is always mounted (empty when there's nothing to
    // say) so screen readers are already watching it when the bar
    // appears. The link inside is the bar's only interactive element.
    <Box
      role="status"
      aria-live="polite"
      sx={(theme) => ({
        position: "sticky",
        zIndex: theme.zIndex.appBar,
        ...belowTopBar(theme),
      })}
    >
      {count > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "stretch",
            mb: 2,
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor: "warning.main",
            color: "warning.contrastText",
            animation: `${bannerEnter} ${ENTER_MS}ms ease-out`,
          }}
        >
          <Box
            component={Link}
            href={ORDER_LIST_PATH}
            onClick={alert.acknowledge}
            sx={(theme) => {
              const darken = alpha(theme.palette.common.black, 0.08);
              return {
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                flexGrow: 1,
                minWidth: 0,
                columnGap: 1,
                rowGap: 0.5,
                minHeight: 44,
                px: 2,
                py: 1,
                border: "none",
                // The solid warning fill — the same colour as "Needs
                // approval" everywhere (DESIGN.md Rules 13 and 25). Text
                // and icon use warning.contrastText: dark, ~6:1 light and
                // ~10:1 dark (white on this orange is only 3.1:1). Opaque,
                // so content scrolls underneath it.
                color: "inherit",
                textDecoration: "none",
                [hoverCapableMedia]: {
                  "&:hover": {
                    backgroundImage: `linear-gradient(${darken}, ${darken})`,
                  },
                },
                // Outside the fill, against the page background.
                "&:focus-visible": {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: -2,
                },
              };
            }}
          >
            <WarningAmberIcon sx={{ color: "inherit" }} />
            <Typography
              component="span"
              variant="body2"
              sx={{ flexGrow: 1, fontWeight: 700 }}
            >
              {t("bannerWaiting", { count })}
            </Typography>
            <Typography
              component="span"
              variant="body2"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 700,
              }}
            >
              {t("viewOrders")}
              <ChevronRightIcon fontSize="small" />
            </Typography>
          </Box>
          {/* Beside the link, never inside it (no nested interactive
            elements). Only while the alert rings. */}
          {alert.isRinging && (
            <Button
              color="inherit"
              startIcon={<VolumeOffIcon aria-hidden />}
              onClick={alert.acknowledge}
              sx={(theme) => ({
                flexShrink: 0,
                minHeight: 44,
                px: 2,
                borderRadius: 0,
                borderLeft: `1px solid ${alpha(theme.palette.warning.contrastText, 0.3)}`,
                fontWeight: 700,
                "&:focus-visible": {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: -2,
                },
              })}
            >
              {t("silence")}
            </Button>
          )}
        </Box>
      )}
      {sound.isLocked && !isOrderList && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 2,
            px: 2,
            py: 1,
            minHeight: 44,
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            color: "text.secondary",
          }}
        >
          <NotificationsOffIcon fontSize="small" aria-hidden />
          <Typography variant="caption">{t("tapToEnableSound")}</Typography>
        </Stack>
      )}
    </Box>
  );
}
