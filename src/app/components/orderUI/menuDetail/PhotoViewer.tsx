"use client";

import { useEffect, useRef } from "react";
import { Box, Dialog, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import type { MenuImageView } from "@/app/lib/storage/assetUrl";
import { useCloseOnBack } from "@/app/lib/hooks/useCloseOnBack";
import { useSlideScroller } from "@/app/lib/hooks/useSlideScroller";
import { useOrderUiLabels } from "../OrderUiLabels";
import { SlideArrows, SlideDots, SnapRow, slideSx } from "./PhotoCarousel";

/**
 * A menu's photos full screen (DESIGN.md §18), opened by tapping a photo
 * in the menu detail (MenuPhotos) at THAT photo: a full-screen dialog on
 * the theme's black, each photo as big as the screen allows — contained,
 * never cropped or stretched. 2–3 photos swipe sideways (the same
 * scroll-snap carousel as the detail — PhotoCarousel, useSlideScroller),
 * with dots, "1 / 3" (role="status"), ‹ › for mouse users and ←/→.
 * × (top-right, inside the safe area), Escape and the browser's Back
 * close it; `onClose` gets the photo last shown, so the detail returns
 * there. Mount it only while open (useCloseOnBack). Words come from
 * OrderUiLabels — shared with staff New Order.
 */
export default function PhotoViewer({
  images,
  name,
  startIndex,
  onClose,
}: {
  images: readonly MenuImageView[];
  /** The menu's name in the surface's language — the dialog's label. */
  name: string;
  startIndex: number;
  /** Called with the photo showing when the viewer closes. */
  onClose: (lastIndex: number) => void;
}) {
  const { menuDetail: labels } = useOrderUiLabels();
  const count = images.length;
  const { scrollerRef, active, handleScroll, goTo, step, handleKeyDown } =
    useSlideScroller(count, startIndex);
  // The photo showing, for close() — read from handlers, never in render.
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  });

  function close() {
    onClose(activeRef.current);
  }
  useCloseOnBack(close);

  return (
    <Dialog
      open
      fullScreen
      onClose={close}
      // MenuPhotos puts focus back on the photo last shown itself.
      disableRestoreFocus
      onKeyDown={count > 1 ? handleKeyDown : undefined}
      slotProps={{
        paper: {
          "aria-modal": true,
          "aria-label": labels.photosOf(name),
          sx: {
            bgcolor: "common.black",
            color: "common.white",
            display: "flex",
            flexDirection: "column",
            height: "100dvh",
            overflow: "hidden",
          },
        },
      }}
    >
      <IconButton
        aria-label={labels.closePhotos}
        onClick={close}
        sx={{
          position: "absolute",
          zIndex: 1,
          top: "calc(8px + env(safe-area-inset-top, 0px))",
          right: "calc(8px + env(safe-area-inset-right, 0px))",
          width: 44,
          height: 44,
          color: "text.primary",
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <CloseIcon />
      </IconButton>

      <Box
        sx={{
          position: "relative",
          flex: 1,
          minHeight: 0,
          pt: "env(safe-area-inset-top, 0px)",
          pl: "env(safe-area-inset-left, 0px)",
          pr: "env(safe-area-inset-right, 0px)",
        }}
      >
        <SnapRow scrollerRef={scrollerRef} onScroll={handleScroll}>
          {images.map((image, index) => (
            <Box
              key={image.url}
              role={count > 1 ? "group" : undefined}
              aria-roledescription={count > 1 ? "slide" : undefined}
              aria-label={
                count > 1 ? labels.imageOf(index + 1, count) : undefined
              }
              sx={slideSx}
            >
              <Box
                component="img"
                src={image.url}
                alt={name}
                loading={index === startIndex ? "eager" : "lazy"}
                sx={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </Box>
          ))}
        </SnapRow>
        {count > 1 && (
          <SlideArrows
            active={active}
            count={count}
            onStep={step}
            previousLabel={labels.previousImage}
            nextLabel={labels.nextImage}
          />
        )}
      </Box>

      {count > 1 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pb: "calc(8px + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <SlideDots
            count={count}
            active={active}
            onSelect={(index) => goTo(index)}
            label={labels.showImage}
            tone="dark"
          />
          <Typography variant="body2" role="status">
            {labels.photoCount(active + 1, count)}
          </Typography>
        </Box>
      )}
    </Dialog>
  );
}
