"use client";

import type { ReactNode } from "react";
import {
  AppBar,
  Box,
  Card,
  Divider,
  Skeleton,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import {
  keyframes,
  useTheme,
  type SxProps,
  type Theme,
} from "@mui/material/styles";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import {
  barClearanceSx,
  railClearanceSx,
} from "@/app/lib/storefront/bottomBarLayout";
import { getOrderPageBackground } from "@/app/lib/theme/orderPageBackground";
import { touchTabletMedia } from "@/app/lib/theme/sharedThemeTokens";
import { CartListPanel, CartPageShell } from "./CartPageParts";
import {
  menuCategoryRowSx,
  menuFilterRowSx,
  menuGridSx,
  menuSearchBoxSx,
  placeHeaderSpacingSx,
} from "./menuBrowserLayout";
import MenuPageFrame from "./MenuPageFrame";
import { HideBottomBar, KeepBottomBarCount } from "./OrderBotBar";
import { orderTopBarSx } from "./OrderTopBar";

/**
 * What the customer pages show while the next one loads (the routes'
 * loading.tsx): text-free shapes in the real pages' frames, so nothing
 * jumps when the content arrives. The bottom bar lives in the layout and
 * stays usable.
 */

const reveal = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

/** ONE delay for every skeleton: on the shop LAN a page arrives in
 *  20–50ms, before this has shown anything (no flicker); through the
 *  tunnel (~250ms) it fades in. "both" holds it invisible during the
 *  delay. Under reduced motion the global block makes the fade instant;
 *  the delay stays. */
const delayedRevealSx = {
  animation: `${reveal} 150ms ease-out 120ms both`,
};

function DelayedReveal({
  children,
  sx,
}: {
  children: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Box aria-hidden sx={[delayedRevealSx, ...(Array.isArray(sx) ? sx : [sx])]}>
      {children}
    </Box>
  );
}

const fullWidthSx = { width: "100%", maxWidth: "none" };

/** OrderTopBar's box, with its words still to come. */
function TopBarSkeleton() {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="transparent"
      sx={orderTopBarSx}
      aria-hidden
    >
      <Toolbar sx={{ gap: 1 }}>
        <StorefrontOutlinedIcon color="primary" sx={{ flexShrink: 0 }} />
        <DelayedReveal
          sx={{
            flexGrow: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography variant="h6" component="span" sx={{ flexGrow: 1, minWidth: 0 }}>
            <Skeleton width="45%" />
          </Typography>
          <Skeleton variant="rounded" width={64} height={36} sx={{ flexShrink: 0 }} />
          <Skeleton variant="circular" width={40} height={40} sx={{ flexShrink: 0 }} />
        </DelayedReveal>
      </Toolbar>
    </AppBar>
  );
}

/** MenuCard's layout, compact on touch tablets the same way. */
function MenuCardSkeleton() {
  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: 0.5,
      }}
    >
      <Skeleton
        variant="rounded"
        sx={{
          ...fullWidthSx,
          height: "auto",
          aspectRatio: "1.45 / 1",
          borderRadius: 2,
          flexShrink: 0,
          [touchTabletMedia]: { aspectRatio: "16 / 9" },
        }}
      />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          pt: 1,
          px: 1,
          pb: 1,
          [touchTabletMedia]: { pt: 0.5, pb: 0.5 },
        }}
      >
        <Typography variant="subtitle2" component="span" sx={{ display: "block" }}>
          <Skeleton width="70%" />
        </Typography>
        <Typography
          variant="body2"
          component="span"
          sx={{ display: "block", [touchTabletMedia]: { display: "none" } }}
        >
          <Skeleton width="90%" />
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mt: "auto",
            pt: 0.5,
            minHeight: 36,
            [touchTabletMedia]: { pt: 0, minHeight: 32 },
          }}
        >
          <Typography variant="subtitle2" component="span" sx={{ flex: 1 }}>
            <Skeleton width="60%" />
          </Typography>
          <Skeleton variant="rounded" width={32} height={32} sx={{ flexShrink: 0 }} />
        </Box>
      </Box>
    </Card>
  );
}

export function MenuPageSkeleton() {
  const theme = useTheme();
  const pageBackground = getOrderPageBackground(theme);
  const barBackground = {
    color: pageBackground.color,
    image: pageBackground.image,
    attachment: "fixed",
  };
  return (
    <MenuPageFrame background={pageBackground} topBar={<TopBarSkeleton />}>
      <KeepBottomBarCount />
      <DelayedReveal>
        <Box sx={placeHeaderSpacingSx}>
          <Skeleton variant="rounded" height={48} sx={{ borderRadius: 1.5 }} />
        </Box>
        <Box sx={menuFilterRowSx(barBackground)}>
          <Box sx={menuSearchBoxSx(barBackground)}>
            {/* The real field's height, whatever the theme makes it. */}
            <Skeleton variant="rounded" sx={fullWidthSx}>
              <TextField fullWidth size="small" disabled />
            </Skeleton>
          </Box>
          <Box
            sx={{
              ...menuCategoryRowSx,
              display: "flex",
              alignItems: "center",
              gap: 1,
              overflow: "hidden",
            }}
          >
            {[56, 88, 72, 96].map((width) => (
              <Skeleton
                key={width}
                variant="rounded"
                width={width}
                height={36}
                sx={{ borderRadius: 999, flexShrink: 0 }}
              />
            ))}
          </Box>
        </Box>
        <Box sx={menuGridSx(theme)}>
          {Array.from({ length: 8 }, (_, index) => (
            <MenuCardSkeleton key={index} />
          ))}
        </Box>
      </DelayedReveal>
    </MenuPageFrame>
  );
}

/** A cart / receipt line: photo, name and details, amount. */
function LineSkeleton() {
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 1.5 }}>
      <Skeleton variant="rounded" width={56} height={56} sx={{ flexShrink: 0 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" component="span" sx={{ display: "block" }}>
          <Skeleton width="60%" />
        </Typography>
        <Typography variant="body2" component="span" sx={{ display: "block" }}>
          <Skeleton width="40%" />
        </Typography>
      </Box>
      <Typography variant="body1" component="span" sx={{ flexShrink: 0 }}>
        <Skeleton width={64} />
      </Typography>
    </Stack>
  );
}

/** The back circle + a page's title row. */
function PageTitleSkeleton({ withSubtitle = false }: { withSubtitle?: boolean }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 2 }}>
      <Skeleton variant="circular" width={40} height={40} sx={{ flexShrink: 0 }} />
      <Stack>
        <Typography variant="h6" component="span">
          <Skeleton width={120} />
        </Typography>
        {withSubtitle && (
          <Typography variant="caption" component="span">
            <Skeleton width={80} />
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}

export function CartPageSkeleton() {
  return (
    <CartPageShell>
      <KeepBottomBarCount />
      <DelayedReveal
        sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
      >
        <PageTitleSkeleton withSubtitle />
        <CartListPanel>
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            <Stack divider={<Divider />}>
              {Array.from({ length: 3 }, (_, index) => (
                <LineSkeleton key={index} />
              ))}
            </Stack>
          </Box>
          <Box sx={{ pt: 1.5 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Typography variant="body2" component="span">
                <Skeleton width={72} />
              </Typography>
              <Typography variant="body2" component="span">
                <Skeleton width={72} />
              </Typography>
            </Stack>
            {/* The "checking prices" note's line. */}
            <Box sx={{ minHeight: "1.66em", mb: 1 }} />
            <Stack direction="row" spacing={1}>
              <Skeleton variant="rounded" height={44} sx={{ flex: 1 }} />
              <Skeleton variant="rounded" height={44} sx={{ flex: 2 }} />
            </Stack>
          </Box>
        </CartListPanel>
      </DelayedReveal>
    </CartPageShell>
  );
}

/** An OrderHistoryCard's box and rows. */
function HistoryCardSkeleton() {
  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2 },
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        minHeight: { xs: 88, sm: 104 },
      }}
    >
      <Typography variant="body1" component="span" sx={{ display: "block", mb: 0.5 }}>
        <Skeleton width="35%" />
      </Typography>
      <Typography variant="body2" component="span" sx={{ display: "block", mb: 0.75 }}>
        <Skeleton width="75%" />
      </Typography>
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="caption" component="span">
          <Skeleton width={56} />
        </Typography>
        <Typography variant="body2" component="span">
          <Skeleton width={72} />
        </Typography>
      </Stack>
    </Box>
  );
}

export function HistoryPageSkeleton() {
  return (
    <Box
      sx={[
        { minHeight: "100dvh", display: "flex", flexDirection: "column" },
        barClearanceSx,
      ]}
    >
      <KeepBottomBarCount />
      <TopBarSkeleton />
      <Box
        sx={[
          {
            flex: 1,
            width: "100%",
            p: { xs: 2, sm: 3 },
            maxWidth: 720,
            mx: "auto",
          },
          railClearanceSx,
        ]}
      >
        <DelayedReveal>
          <PageTitleSkeleton />
          <Stack spacing={{ xs: 1.5, sm: 2 }}>
            {Array.from({ length: 3 }, (_, index) => (
              <HistoryCardSkeleton key={index} />
            ))}
          </Stack>
        </DelayedReveal>
      </Box>
    </Box>
  );
}

/** The receipt has no bottom bar (it has its own Back and Order more), so
 *  neither does its skeleton. */
export function ReceiptPageSkeleton() {
  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <HideBottomBar />
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          p: { xs: 2, sm: 3 },
          maxWidth: 720,
          width: "100%",
          mx: "auto",
        }}
      >
        <DelayedReveal>
          <PageTitleSkeleton withSubtitle />
          <Stack divider={<Divider />}>
            {Array.from({ length: 3 }, (_, index) => (
              <LineSkeleton key={index} />
            ))}
          </Stack>
        </DelayedReveal>
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          px: { xs: 2, sm: 3 },
          pt: 1.5,
          pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <DelayedReveal sx={{ maxWidth: 720, mx: "auto" }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Box sx={{ flexShrink: 0 }}>
              <Typography variant="caption" component="p">
                <Skeleton width={48} />
              </Typography>
              <Typography variant="subtitle1" component="p">
                <Skeleton width={96} />
              </Typography>
            </Box>
            <Skeleton
              variant="rounded"
              height={44}
              sx={{ flex: 1, minWidth: 0, maxWidth: 280, ml: "auto" }}
            />
          </Stack>
        </DelayedReveal>
      </Box>
    </Box>
  );
}
