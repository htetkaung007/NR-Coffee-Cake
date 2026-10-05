"use client";

import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { BackofficeTopBar } from "./BackofficeTopBar";
import { BackofficeSideBar } from "./BackofficeSideBar";
import { backofficePageTop } from "../lib/theme/sharedThemeTokens";
import type { NavRole } from "../lib/backofficeNav";

interface Props {
  children?: React.ReactNode;
  companyName?: string;
  locationName: string | null;
  role: NavRole;
}

export function BackofficeShell({
  children,
  companyName,
  locationName,
  role,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <BackofficeTopBar
        onMenuClick={() => setMobileOpen((prev) => !prev)}
        companyName={companyName}
        locationName={locationName}
        canChangeLocation={role === "ADMIN"}
      />
      <Box>
        <BackofficeSideBar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          role={role}
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
          pb: 3,
          // Phones: the one horizontal gutter (12px) for every Backoffice
          // page — the content wrapper in backoffice/layout.tsx adds none.
          px: { xs: 1.5, sm: 3 },
          /* width: { sm: `calc(100% - ${SIDEBAR_WIDTH}px)` }, */
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
