"use client";

import { useRef, useState } from "react";
import { Box, ButtonBase } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import MenuThumb from "@/app/components/MenuThumb";
import type { MenuImageView } from "@/app/lib/storage/assetUrl";
import { carouselMode, isTap } from "@/app/lib/menu/carousel";
import { useSlideScroller } from "@/app/lib/hooks/useSlideScroller";
import { useOrderUiLabels } from "../OrderUiLabels";
import { SlideArrows, SlideDots, SnapRow, slideSx } from "./PhotoCarousel";
import PhotoViewer from "./PhotoViewer";

/**
 * The menu detail's photos (DESIGN.md §18), in the caller's fixed box
 * (`frameSx`: the dialog's 4:3, the sheet's 160px band) — the whole
 * picture, never cropped (fit contain), so nothing jumps:
 * - none → the letter tile (`placeholder`) or nothing — no viewer;
 * - one → just the photo;
 * - two or three → a swipe carousel: CSS scroll-snap (no library), dots
 *   in a 44px row under the box, ‹ › on the photo for mouse users only
 *   (hoverCapableMedia), ←/→ when it has focus — the pieces shared with
 *   the viewer (PhotoCarousel, useSlideScroller).
 * Every photo is a button ("View photo 1 of 3"): a TAP opens the
 * full-screen viewer at that photo (PhotoViewer); a sideways swipe moves
 * the photos and a vertical drag closes the sheet — never the viewer
 * (lib/menu/carousel isTap). Closing the viewer comes back to the photo
 * last shown, focused.
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
  if (carouselMode(images.length) === "none") {
    return placeholder ? (
      <Box sx={frameSx}>
        <MenuThumb name={name} imageUrl={null} alt={name} fit="contain" />
      </Box>
    ) : null;
  }
  // A new set of photos (another menu) starts again at the first.
  return (
    <PhotoGallery
      key={images.map((image) => image.url).join(" ")}
      images={images}
      name={name}
      frameSx={frameSx}
    />
  );
}

function PhotoGallery({
  images,
  name,
  frameSx,
}: {
  images: readonly MenuImageView[];
  name: string;
  frameSx: SxProps<Theme>;
}) {
  const { menuDetail: labels } = useOrderUiLabels();
  const count = images.length;
  const isCarousel = carouselMode(count) === "carousel";
  const { scrollerRef, active, handleScroll, goTo, step, handleKeyDown } =
    useSlideScroller(count);
  const [viewerAt, setViewerAt] = useState<number | null>(null);
  const photoButtons = useRef<(HTMLButtonElement | null)[]>([]);

  /** Back from the viewer: at the photo last shown there, focused. */
  function closeViewer(lastIndex: number) {
    setViewerAt(null);
    goTo(lastIndex, { instant: true });
    requestAnimationFrame(() => photoButtons.current[lastIndex]?.focus());
  }

  const photos = (
    <Box
      sx={[
        { position: "relative" },
        ...(Array.isArray(frameSx) ? frameSx : [frameSx]),
      ]}
    >
      <SnapRow scrollerRef={scrollerRef} onScroll={handleScroll}>
        {images.map((image, index) => (
          <Box
            key={image.url}
            role={isCarousel ? "group" : undefined}
            aria-roledescription={isCarousel ? "slide" : undefined}
            aria-label={isCarousel ? labels.imageOf(index + 1, count) : undefined}
            sx={slideSx}
          >
            <PhotoButton
              label={
                isCarousel ? labels.viewPhotoOf(index + 1, count) : labels.viewPhoto
              }
              scrollerRef={scrollerRef}
              buttonRef={(button) => {
                photoButtons.current[index] = button;
              }}
              onOpen={() => setViewerAt(index)}
            >
              <MenuThumb
                name={name}
                imageUrl={image.url}
                alt={name}
                fit="contain"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </PhotoButton>
          </Box>
        ))}
      </SnapRow>
      {isCarousel && (
        <SlideArrows
          active={active}
          count={count}
          onStep={step}
          previousLabel={labels.previousImage}
          nextLabel={labels.nextImage}
        />
      )}
    </Box>
  );

  return (
    <>
      {isCarousel ? (
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
          {photos}
          <SlideDots
            count={count}
            active={active}
            onSelect={(index) => goTo(index)}
            label={labels.showImage}
            tone="paper"
          />
        </Box>
      ) : (
        photos
      )}
      {viewerAt !== null && (
        <PhotoViewer
          images={images}
          name={name}
          startIndex={viewerAt}
          onClose={closeViewer}
        />
      )}
    </>
  );
}

/**
 * A photo as a button that opens the viewer on a TAP only: the pointer's
 * movement and the row's scroll between press and click must stay small
 * (isTap) — a swipe through the photos or the sheet's drag-to-close never
 * opens it. A keyboard press (Enter / Space — no pointer) always does.
 */
function PhotoButton({
  label,
  scrollerRef,
  buttonRef,
  onOpen,
  children,
}: {
  label: string;
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  buttonRef: (button: HTMLButtonElement | null) => void;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  const press = useRef<{ x: number; y: number; scroll: number } | null>(null);
  const scrollLeft = () => scrollerRef.current?.scrollLeft ?? 0;

  return (
    <ButtonBase
      ref={buttonRef}
      aria-label={label}
      onPointerDown={(event) => {
        press.current = {
          x: event.clientX,
          y: event.clientY,
          scroll: scrollLeft(),
        };
      }}
      onClick={(event) => {
        const start = press.current;
        press.current = null;
        // detail 0 = a keyboard press — never a swipe.
        if (
          event.detail !== 0 &&
          start &&
          !isTap({
            movedX: event.clientX - start.x,
            movedY: event.clientY - start.y,
            scrolledBy: scrollLeft() - start.scroll,
          })
        ) {
          return;
        }
        onOpen();
      }}
      sx={{
        display: "block",
        width: "100%",
        height: "100%",
        "&:focus-visible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: -2,
        },
      }}
    >
      {children}
    </ButtonBase>
  );
}
