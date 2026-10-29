"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Avatar, Box, Stack } from "@mui/material";
import {
  barClearanceSx,
  railClearanceSx,
} from "@/app/lib/storefront/bottomBarLayout";
import BackCircleButton from "./BackCircleButton";

/**
 * The shared frame of a round's outcome screens (OrderConfirmedScreen,
 * OrderRejectedScreen): a full-height centred page, the back arrow
 * (to the menu) top-left, then a 400px column led by a large round icon
 * in the outcome's colour role. Each screen supplies its own texts and
 * buttons as children. Od theme colours only. The floating bottom bar
 * stays on these screens; the page keeps its room free (barClearanceSx,
 * railClearanceSx), so the column (and its buttons) is centred above the
 * bar — or beside the rail on a landscape touch screen.
 */
export default function OutcomeScreenShell({
  onBack,
  icon,
  tone,
  beforeContent,
  children,
}: {
  onBack: () => void;
  icon: ReactNode;
  /** success = accepted; warning = needs another look (never error). */
  tone: "success" | "warning";
  /** Rendered before the column (e.g. a visually hidden live region). */
  beforeContent?: ReactNode;
  children: ReactNode;
}) {
  const tCommon = useTranslations("common");
  return (
    <Box
      sx={[
        {
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          p: 3,
          position: "relative",
        },
        // The bar's room (bottom, or the rail's on the right).
        barClearanceSx,
        railClearanceSx,
      ]}
    >
      <BackCircleButton
        ariaLabel={tCommon("backToMenu")}
        onClick={onBack}
        sx={{ position: "absolute", top: 16, left: 16 }}
      />
      {beforeContent}
      <Stack sx={{ width: "100%", maxWidth: 400, alignItems: "center" }}>
        <Avatar
          sx={{
            width: 96,
            height: 96,
            mb: 3,
            bgcolor: `${tone}.main`,
            color: `${tone}.contrastText`,
          }}
        >
          {icon}
        </Avatar>
        {children}
      </Stack>
    </Box>
  );
}
