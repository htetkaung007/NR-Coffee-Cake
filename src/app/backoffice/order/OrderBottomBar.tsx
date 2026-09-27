"use client";

import { Box, Button } from "@mui/material";

/**
 * Below the width where OrderSidePanel shows (`hideFrom`): a summary
 * (children — e.g. the total to pay) and one primary action that opens
 * the panel's content in OrderPanelDrawer — pinned to the bottom of the
 * viewport.
 *
 * Sticky at the end of the page's content column rather than
 * position: fixed — it then stays within the content area (never over
 * the permanent sidebar from sm up) and takes up its own space in the
 * flow, so it can never cover the last row above it. Bottom padding
 * clears the home indicator (safe-area-inset-bottom).
 */
export default function OrderBottomBar({
  hideFrom,
  actionLabel,
  onAction,
  children,
}: {
  hideFrom: "md" | "lg";
  actionLabel: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={(theme) => ({
        display: { xs: "flex", [hideFrom]: "none" },
        alignItems: "center",
        gap: 2,
        position: "sticky",
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        mt: 2,
        px: 2,
        pt: 1,
        pb: `calc(${theme.spacing(1)} + env(safe-area-inset-bottom, 0px))`,
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
      })}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
      <Button
        variant="contained"
        color="primary"
        onClick={onAction}
        sx={{ minHeight: 44, flexShrink: 0 }}
      >
        {actionLabel}
      </Button>
    </Box>
  );
}
