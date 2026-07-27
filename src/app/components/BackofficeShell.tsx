"use client";

import { useState } from "react";
import { Box, Toolbar } from "@mui/material";
import { BackofficeTopBar } from "./BackofficeTopBar";
import { BackofficeSideBar, SIDEBAR_WIDTH } from "./BackofficeSideBar";

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
          p: 3,
          /* width: { sm: `calc(100% - ${SIDEBAR_WIDTH}px)` }, */
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
