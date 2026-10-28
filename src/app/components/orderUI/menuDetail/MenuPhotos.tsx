"use client";

import { useEffect, useRef, useState } from "react";
import { Box, ButtonBase, IconButton, useMediaQuery } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import MenuThumb from "@/app/components/MenuThumb";
import type { MenuImageView } from "@/app/lib/storage/assetUrl";
import {
  activeSlideFromScroll,
  carouselMode,
  stepSlide,
} from "@/app/lib/menu/carousel";
import {
  hoverCapableMedia,
  reducedMotionQuery,
} from "@/app/lib/theme/sharedThemeTokens";
import { useOrderUiLabels } from "../OrderUiLabels";

/**
 * The menu detail's photos (DESIGN.md §18), in the caller's fixed box
 * (`frameSx`: the dialog's 4:3, the sheet's 160px band) — the whole
 * picture, never cropped (fit contain), so nothing jumps:
 * - none → the letter tile (`placeholder`) or nothing;
 * - one → just the photo;
 * - two or three → a swipe carousel: CSS scroll-snap (no library), dots
 *   in a 44px row under the box, ‹ › on the photo for mouse users only
 *   (hoverCapableMedia), ←/→ when it has focus.
 * Shared with staff New Order — its words come from the OrderUiLabels
 * context (never useTranslations).
 */
export default function MenuPhotos({
  images,
  name,
  frameSx,
  placeholder,
}: {
  images: readonly MenuImageView[];
  /** The menu's name in the surface's language — alt text and labels. */
  name: string;
  frameSx: SxProps<Theme>;
  /** No photo: show the letter tile (dialog) or nothing (sheet). */
  placeholder: boolean;
}) {
  const mode = carouselMode(images.length);
  if (mode === "none") {
    return placeholder ? (
      <Box sx={frameSx}>
        <MenuThumb name={name} imageUrl={null} alt={name} fit="contain" />
      </Box>
    ) : null;
  }
  if (mode === "single") {
    return (
      <Box sx={frameSx}>
        <MenuThumb
          name={name}
          imageUrl={images[0].url}
          alt={name}
          fit="contain"
          loading="eager"
        />
      </Box>
    );
  }
  // A new set of photos (another menu) starts again at the first.
  return (
    <PhotoCarousel
      key={images.map((image) => image.url).join(" ")}
      images={images}
      name={name}
      frameSx={frameSx}
    />
  );
}

/** The ‹ › buttons: round, paper on the photo, 44px — laptops only. */
const arrowSx = (side: "left" | "right"): SxProps<Theme> => ({
  display: "none",
  [hoverCapableMedia]: { display: "inline-flex" },
  position: "absolute",
  top: "50%",
  [side]: 8,
  transform: "translateY(-50%)",
  width: 44,
  height: 44,
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  "&.Mui-disabled": { opacity: 0, pointerEvents: "none" },
});

function PhotoCarousel({
  images,
  name,
  frameSx,
}: {
  images: readonly MenuImageView[];
  name: string;
  frameSx: SxProps<Theme>;
}) {
  const { menuDetail: labels } = useOrderUiLabels();
  const reducedMotion = useMediaQuery(reducedMotionQuery);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pendingFrame = useRef<number | null>(null);
  const [active, setActive] = useState(0);
  const count = images.length;

  useEffect(
    () => () => {
      if (pendingFrame.current !== null) cancelAnimationFrame(pendingFrame.current);
    },
    [],
  );

  /** The slide showing, read once per frame while it scrolls (a swipe, a
   *  dot, an arrow — they all just scroll the row). */
  function handleScroll() {
    if (pendingFrame.current !== null) return;
    pendingFrame.current = requestAnimationFrame(() => {
      pendingFrame.current = null;
      const scroller = scrollerRef.current;
      if (!scroller) return;
      setActive(
        activeSlideFromScroll(scroller.scrollLeft, scroller.clientWidth, count),
      );
    });
  }

  function goTo(index: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({
      left: index * scroller.clientWidth,
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    goTo(stepSlide(active, event.key === "ArrowLeft" ? -1 : 1, count));
  }

  return (
    <Box
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.photosOf(name)}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      sx={{
        borderRadius: 1,
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
        },
      }}
    >
      <Box sx={[{ position: "relative" }, ...(Array.isArray(frameSx) ? frameSx : [frameSx])]}>
        <Box
          ref={scrollerRef}
          onScroll={handleScroll}
          sx={{
            display: "flex",
            width: "100%",
            height: "100%",
            overflowX: "auto",
            overflowY: "hidden",
            scrollSnapType: "x mandatory",
            // A sideways swipe stays here — never the browser's back
            // gesture. (The phone sheet's drag-to-close only takes a
            // mostly-vertical gesture — MUI SwipeableDrawer.)
            overscrollBehaviorX: "contain",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {images.map((image, index) => (
            <Box
              key={image.url}
              role="group"
              aria-roledescription="slide"
              aria-label={labels.imageOf(index + 1, count)}
              sx={{
                flex: "0 0 100%",
                height: "100%",
                scrollSnapAlign: "center",
              }}
            >
              <MenuThumb
                name={name}
                imageUrl={image.url}
                alt={name}
                fit="contain"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </Box>
          ))}
        </Box>
        <IconButton
          aria-label={labels.previousImage}
          disabled={active === 0}
          onClick={() => goTo(stepSlide(active, -1, count))}
          sx={arrowSx("left")}
        >
          <ChevronLeftIcon />
        </IconButton>
        <IconButton
          aria-label={labels.nextImage}
          disabled={active === count - 1}
          onClick={() => goTo(stepSlide(active, 1, count))}
          sx={arrowSx("right")}
        >
          <ChevronRightIcon />
        </IconButton>
      </Box>

      {/* The dots: a small mark in a 44px tap area each. The current one
          is a wider primary pill + aria-current — shape, not colour alone. */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        {images.map((image, index) => {
          const isActive = index === active;
          return (
            <ButtonBase
              key={image.url}
              aria-label={labels.showImage(index + 1)}
              aria-current={isActive ? "true" : undefined}
              onClick={() => goTo(index)}
              sx={{ width: 44, height: 44, borderRadius: "50%" }}
            >
              <Box
                component="span"
                aria-hidden
                sx={{
                  display: "block",
                  height: 8,
                  width: isActive ? 20 : 8,
                  borderRadius: 4,
                  bgcolor: isActive ? "primary.main" : "text.secondary",
                }}
              />
            </ButtonBase>
          );
        })}
      </Box>
    </Box>
  );
}
