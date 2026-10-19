"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Button } from "@mui/material";
import {
  SIDEBAR_RAIL_WIDTH,
  SIDEBAR_WIDTH,
  whenSidebarRail,
} from "@/app/lib/backofficeSidebar";

/**
 * Below the width where OrderSidePanel shows (`hideFrom`): a summary
 * (children — e.g. the total to pay) and one primary action that opens
 * the panel's content in SidePanelDrawer — pinned to the bottom of the
 * viewport.
 *
 * Default: sticky at the end of the page's content column rather than
 * position: fixed — it then stays within the content area (never over
 * the permanent sidebar from sm up) and takes up its own space in the
 * flow, so it can never cover the last row above it.
 *
 * `pinned` (staff New Order): position fixed at the screen's bottom edge
 * whatever the content height — sticky can't do that (with few menus it
 * ends right under them, and the page's own bottom padding keeps it off
 * the edge at the end of a long page). It starts at the sidebar's edge
 * from sm (the rail's on a touch tablet with it collapsed), and an in-flow spacer of its measured height keeps the last
 * row of cards clear of it. Either way it sits over the page (app-bar
 * level) but under the drawer / sheet it opens and under dialogs. Bottom
 * padding clears the home indicator (safe-area-inset-bottom).
 */
export default function OrderBottomBar({
  hideFrom,
  actionLabel,
  onAction,
  pinned = false,
  children,
}: {
  hideFrom: "md" | "lg";
  actionLabel: string;
  onAction: () => void;
  /** Fixed to the viewport's bottom edge (see above). */
  pinned?: boolean;
  children: React.ReactNode;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [barHeight, setBarHeight] = useState(0);

  // The spacer follows the bar's real height (its summary wraps).
  useEffect(() => {
    const bar = barRef.current;
    if (!pinned || !bar) return;
    const observer = new ResizeObserver(() => setBarHeight(bar.offsetHeight));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [pinned]);

  return (
    <>
      {pinned && (
        <Box
          aria-hidden
          sx={{
            display: { xs: "block", [hideFrom]: "none" },
            height: barHeight,
            mt: 2,
          }}
        />
      )}
      <Box
        ref={barRef}
        sx={(theme) => ({
          display: { xs: "flex", [hideFrom]: "none" },
          alignItems: "center",
          gap: 2,
          zIndex: theme.zIndex.appBar,
          px: 2,
          pt: 1,
          pb: `calc(${theme.spacing(1)} + env(safe-area-inset-bottom, 0px))`,
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          ...(pinned
            ? {
                position: "fixed",
                bottom: 0,
                left: { xs: 0, sm: SIDEBAR_WIDTH },
                right: 0,
                ...whenSidebarRail({ left: SIDEBAR_RAIL_WIDTH }),
              }
            : { position: "sticky", bottom: 0, mt: 2 }),
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
    </>
  );
}
