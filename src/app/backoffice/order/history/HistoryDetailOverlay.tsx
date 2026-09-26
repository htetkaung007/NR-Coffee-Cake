"use client";

import { Dialog, Drawer, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const SIDE_DRAWER_WIDTH = 420;

/**
 * Below lg only: the selected row's detail opens here — a full-screen
 * Dialog on phones (<sm), a right-hand Drawer on tablets (sm–lg). The
 * close (×) button is HistoryDetail's own; Escape and a tap outside
 * close it too (MUI's defaults). Closing removes `bill` from the URL
 * (HistoryView's job) so the browser Back button closes it as well.
 */
export default function HistoryDetailOverlay({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));

  if (isPhone) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        slotProps={{
          paper: {
            sx: { display: "flex", flexDirection: "column" },
          },
        }}
      >
        {children}
      </Dialog>
    );
  }

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          role: "dialog",
          "aria-label": "Details",
          sx: {
            display: "flex",
            flexDirection: "column",
            width: SIDE_DRAWER_WIDTH,
            maxWidth: "100vw",
            bgcolor: "background.default",
          },
        },
      }}
    >
      {children}
    </Drawer>
  );
}
