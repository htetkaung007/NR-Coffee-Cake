"use client";

import { Box, IconButton, SwipeableDrawer } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

/** Phone bottom sheet: full width, capped as a share of the viewport (dvh,
 *  so mobile browser bars don't cut it off) so the header and the sticky
 *  footer stay reachable and only the middle scrolls. The min values keep
 *  it from collapsing while the item is still loading. */
const SHEET = { minWidth: 320, minHeight: 320, maxHeight: "90dvh" };

interface MenuDetailSheetProps {
  open: boolean;
  onClose: () => void;
  /** The sticky action area (MenuDetailFooter), or null when there's
   *  nothing to act on yet. */
  footer: React.ReactNode;
  children: React.ReactNode;
}

/** The item detail as a bottom sheet: slides up from the bottom; closes
 *  with the ✕, by dragging it down, or by tapping the dimmed area
 *  outside. */
export default function MenuDetailSheet({
  open,
  onClose,
  footer,
  children,
}: MenuDetailSheetProps) {
  return (
    <SwipeableDrawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      // Required by SwipeableDrawer; the sheet is only ever opened by its
      // parent (open prop), never by swiping up from the screen edge.
      onOpen={() => undefined}
      disableSwipeToOpen
      disableDiscovery
      transitionDuration={{ enter: 300, exit: 220 }}
      slotProps={{
        paper: {
          sx: {
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minWidth: SHEET.minWidth,
            minHeight: SHEET.minHeight,
            maxHeight: SHEET.maxHeight,
            overflow: "hidden",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            bgcolor: "background.paper",
          },
        },
      }}
    >
      {/* Grab handle + close button. Dragging the sheet down (from here or
         anywhere on it) closes it. */}
      <Box
        sx={{
          flexShrink: 0,
          position: "relative",
          display: "flex",
          justifyContent: "center",
          pt: 1.25,
          pb: 1,
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 40,
            height: 4,
            borderRadius: 2,
            bgcolor: "text.disabled",
          }}
        />
        <IconButton
          aria-label="Close"
          size="small"
          onClick={onClose}
          sx={{ position: "absolute", right: 12, top: 8 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box
        sx={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          px: 2.5,
          pb: 2,
        }}
      >
        {children}
      </Box>

      {footer}
    </SwipeableDrawer>
  );
}
