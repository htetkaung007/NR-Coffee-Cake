"use client";

import type { ReactNode } from "react";
import { Avatar, Box, Stack } from "@mui/material";
import BackCircleButton from "./BackCircleButton";

/**
 * The shared frame of a round's outcome screens (OrderConfirmedScreen,
 * OrderRejectedScreen): a full-height centred page, the back arrow
 * (to the menu) top-left, then a 400px column led by a large round icon
 * in the outcome's colour role. Each screen supplies its own texts and
 * buttons as children. Od theme colours only.
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
  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
        position: "relative",
      }}
    >
      <BackCircleButton
        ariaLabel="Back to menu"
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
