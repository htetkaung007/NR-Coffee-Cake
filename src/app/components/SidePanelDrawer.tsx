"use client";

import { Box, Drawer, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const SIDE_DRAWER_WIDTH = 400;

/**
 * Where a master–detail page's side panel opens below its breakpoint
 * (the order pages' OrderSidePanel via OrderBottomBar, the Add-ons
 * group panel): a right-hand drawer on tablets, a bottom sheet on phones
 * (rounded top, grab handle, capped at 85vh). The close (×) button is
 * the content's own; Escape and a tap outside close it too (MUI's
 * defaults). MUI's own slide transition only — nothing extra.
 */
export default function SidePanelDrawer({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog, e.g. "Bill", "Current order". */
  label: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Drawer
      anchor={isPhone ? "bottom" : "right"}
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-label": label,
          sx: {
            display: "flex",
            flexDirection: "column",
            bgcolor: "background.paper",
            ...(isPhone
              ? {
                  maxHeight: "85vh",
                  borderTopLeftRadius: theme.spacing(2),
                  borderTopRightRadius: theme.spacing(2),
                  pb: "env(safe-area-inset-bottom, 0px)",
                }
              : { width: SIDE_DRAWER_WIDTH, maxWidth: "100vw" }),
          },
        },
      }}
    >
      {isPhone && (
        // Visual grab handle — the sheet closes via ×, Escape or a tap
        // outside, not by dragging.
        <Box
          aria-hidden
          sx={{
            flexShrink: 0,
            width: 40,
            height: 4,
            mx: "auto",
            mt: 1,
            borderRadius: 1,
            bgcolor: "divider",
          }}
        />
      )}
      {children}
    </Drawer>
  );
}
