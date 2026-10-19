"use client";

import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { BackofficeTopBar } from "./BackofficeTopBar";
import { BackofficeSideBar } from "./BackofficeSideBar";
import {
  backofficePageTop,
  backofficePageTopTouch,
  touchScreenMedia,
} from "../lib/theme/sharedThemeTokens";
import type { NavRole } from "../lib/backofficeNav";
import type { TopBarLocation } from "./OnlineMenuStatus";

interface Props {
  children?: React.ReactNode;
  companyName?: string;
  /** The selected location (null: none, or archived). */
  location: TopBarLocation | null;
  role: NavRole;
}

export function BackofficeShell({
  children,
  companyName,
  location,
  role,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        // THE one height owner of every Backoffice page: at least the
        // screen (dvh — never vh, which on phones / tablets counts the
        // browser's hideable toolbar). Nothing inside adds a min-height of
        // its own, so a short page never scrolls.
        minHeight: "100dvh",
        bgcolor: "background.default",
      }}
    >
      <BackofficeTopBar
        onMenuClick={() => setMobileOpen((prev) => !prev)}
        companyName={companyName}
        location={location}
        canChangeLocation={role === "ADMIN"}
      />
      <Box>
        <BackofficeSideBar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // Lets wide content (e.g. a long amount) wrap instead of
          // stretching the page past a phone's width.
          minWidth: 0,
          // The one top gap below the top bar for every page (pages and
          // the layout add none of their own).
          pt: backofficePageTop,
          // Touch screens: 16px, so the title sits close under the bar.
          [touchScreenMedia]: { pt: backofficePageTopTouch },
          pb: 3,
          // Phones: the one horizontal gutter (12px) for every Backoffice
          // page — the content wrapper in backoffice/layout.tsx adds none.
          px: { xs: 1.5, sm: 3 },
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
