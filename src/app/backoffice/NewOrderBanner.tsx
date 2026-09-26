"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { alpha, keyframes, type Theme } from "@mui/material/styles";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { useOrderAlerts } from "./OrderAlertsProvider";

const ORDER_LIST_PATH = "/backoffice/order";
const ENTRY_DETAIL_PATH = /^\/backoffice\/order\/([^/]+)$/;

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
 * once the rounds are accepted, rejected or expire.
 */
export default function NewOrderBanner() {
  const pathname = usePathname();
  const { pending } = useOrderAlerts();

  const viewingEntryKey = ENTRY_DETAIL_PATH.exec(pathname)?.[1] ?? null;
  const count =
    pathname === ORDER_LIST_PATH
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
          component={Link}
          href={ORDER_LIST_PATH}
          sx={(theme) => {
            const tint = (opacity: number) =>
              alpha(theme.palette.warning.main, opacity);
            return {
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              columnGap: 1,
              rowGap: 0.5,
              minHeight: 44,
              px: 2,
              py: 1,
              mb: 2,
              borderRadius: 2,
              border: 1,
              borderColor: "warning.main",
              color: "text.primary",
              textDecoration: "none",
              // Opaque (content scrolls underneath), tinted with the
              // warning color over the paper background.
              backgroundColor: "background.paper",
              backgroundImage: `linear-gradient(${tint(0.16)}, ${tint(0.16)})`,
              animation: `${bannerEnter} ${ENTER_MS}ms ease-out`,
              [hoverCapableMedia]: {
                "&:hover": {
                  backgroundImage: `linear-gradient(${tint(0.26)}, ${tint(0.26)})`,
                },
              },
              "&:focus-visible": {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: 2,
              },
            };
          }}
        >
          <WarningAmberIcon sx={{ color: "warning.main" }} />
          <Typography
            component="span"
            variant="body2"
            sx={{ flexGrow: 1, fontWeight: 700 }}
          >
            New order waiting — {count} {count === 1 ? "needs" : "need"}{" "}
            approval
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
            View orders
            <ChevronRightIcon fontSize="small" />
          </Typography>
        </Box>
      )}
    </Box>
  );
}
