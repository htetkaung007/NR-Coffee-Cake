"use client";

import { Box, Drawer, SwipeableDrawer, useMediaQuery } from "@mui/material";
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
 *
 * `swipeToClose` (opt-in, default false — the Add-ons group panel): a
 * SHEET can also be dragged down to close (MUI SwipeableDrawer, as the
 * customer menu's MenuDetailSheet: never swiped open, no discovery
 * peek). Scrollable content inside still scrolls; a drag down closes it
 * only once that content is scrolled to the top (SwipeableDrawer leaves
 * a touch to any element under it that can still scroll that way). The
 * right-hand drawer never swipes.
 */
export default function SidePanelDrawer({
  open,
  onClose,
  label,
  placement = "auto",
  swipeToClose = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog, e.g. "Bill", "Current order". */
  label: string;
  placement?: "auto" | "sheet";
  /** Sheet only: drag it down to close (see above). */
  swipeToClose?: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const isPhoneWidth = useMediaQuery(theme.breakpoints.down("sm"));
  const isSheet = placement === "sheet" || isPhoneWidth;

  const drawerProps = {
    anchor: isSheet ? ("bottom" as const) : ("right" as const),
    open,
    onClose,
    slotProps: {
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
    },
  };
  const canSwipe = isSheet && swipeToClose;

  const content = (
    <>
      {isSheet && (
        // Grab handle. With swipeToClose the sheet can be dragged down
        // by it (or anywhere on the sheet) to close; otherwise it's
        // visual only — ×, Escape or a tap outside close the sheet.
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
    </>
  );

  return canSwipe ? (
    <SwipeableDrawer
      {...drawerProps}
      // Required by SwipeableDrawer; the sheet is only ever opened by its
      // parent (open prop), never by swiping up from the screen edge.
      onOpen={() => undefined}
      disableSwipeToOpen
      disableDiscovery
    >
      {content}
    </SwipeableDrawer>
  ) : (
    <Drawer {...drawerProps}>{content}</Drawer>
  );
}
