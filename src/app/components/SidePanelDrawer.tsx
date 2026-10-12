"use client";

import { Box, Drawer, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const SIDE_DRAWER_WIDTH = 400;

/** The bottom sheet's width cap on tablets — centred, not edge to edge. */
const SHEET_MAX_WIDTH = 640;

/**
 * Where a master–detail page's side panel opens below its breakpoint
 * (the order pages' OrderSidePanel via OrderBottomBar, the Add-ons
 * group panel, Settings' manager access). `placement`:
 * - "auto" (default): a right-hand drawer on tablets, a bottom sheet on
 *   phones.
 * - "sheet": a bottom sheet on every size — centred with a 640px cap
 *   from sm (New Order's current order: the side is where the
 *   navigation drawer comes from).
 * A sheet has rounded top corners, a grab handle, an 85vh cap and clears
 * the home indicator. The close (×) button is the content's own; Escape
 * and a tap outside close it too (MUI's defaults). MUI's own slide
 * transition only — nothing extra.
 */
export default function SidePanelDrawer({
  open,
  onClose,
  label,
  placement = "auto",
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog, e.g. "Bill", "Current order". */
  label: string;
  placement?: "auto" | "sheet";
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isPhoneWidth = useMediaQuery(theme.breakpoints.down("sm"));
  const isSheet = placement === "sheet" || isPhoneWidth;

  return (
    <Drawer
      anchor={isSheet ? "bottom" : "right"}
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
            ...(isSheet
              ? {
                  maxHeight: "85vh",
                  // Centred on wider screens (fixed with left/right 0 and
                  // auto margins); edge to edge on phones.
                  width: "100%",
                  maxWidth: { sm: SHEET_MAX_WIDTH },
                  mx: "auto",
                  borderTopLeftRadius: theme.spacing(2),
                  borderTopRightRadius: theme.spacing(2),
                  pb: "env(safe-area-inset-bottom, 0px)",
                }
              : { width: SIDE_DRAWER_WIDTH, maxWidth: "100vw" }),
          },
        },
      }}
    >
      {isSheet && (
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
