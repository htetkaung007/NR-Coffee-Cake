"use client";

import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { BackofficeTopBar } from "./BackofficeTopBar";
import { BackofficeSideBar } from "./BackofficeSideBar";

interface Props {
  children?: React.ReactNode;
  companyName?: string;
}

export function BackofficeShell({ children, companyName }: Props) {
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
          p: 3,
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
