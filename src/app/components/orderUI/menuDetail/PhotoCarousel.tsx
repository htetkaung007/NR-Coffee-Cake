"use client";

import { Box, ButtonBase, IconButton } from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

/**
 * The pieces of the menu photos' swipe carousel, shared by the detail's
 * small carousel (MenuPhotos) and the full-screen viewer (PhotoViewer) —
 * one copy of each; the scroll logic is lib/hooks/useSlideScroller.
 * CSS scroll-snap, no library (DESIGN.md §18 "Menu detail photos").
 */

/** The scroll-snap row: full-width slides, no scrollbar, and a sideways
 *  swipe that stays here — never the browser's back gesture. (The phone
 *  sheet's drag-to-close only takes a mostly-vertical gesture.) */
export function SnapRow({
  scrollerRef,
  onScroll,
  children,
}: {
  scrollerRef: React.Ref<HTMLDivElement>;
  onScroll: () => void;
  children: React.ReactNode;
}) {
  return (
    <Box
      ref={scrollerRef}
      onScroll={onScroll}
      sx={{
        display: "flex",
        width: "100%",
        height: "100%",
        overflowX: "auto",
        overflowY: "hidden",
        scrollSnapType: "x mandatory",
        overscrollBehaviorX: "contain",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {children}
    </Box>
  );
}

/** One full-width slide in a SnapRow. */
export const slideSx: SxProps<Theme> = {
  flex: "0 0 100%",
  height: "100%",
  scrollSnapAlign: "center",
};

/** The ‹ › buttons: round, paper on the photo, 44px — mouse users only
 *  (hoverCapableMedia; touch swipes); hidden at the first / last slide.
 *  The parent is the photo's positioned box. */
export function SlideArrows({
  active,
  count,
  onStep,
  previousLabel,
  nextLabel,
}: {
  active: number;
  count: number;
  onStep: (direction: -1 | 1) => void;
  previousLabel: string;
  nextLabel: string;
}) {
  return (
    <>
      <IconButton
        aria-label={previousLabel}
        disabled={active === 0}
        onClick={() => onStep(-1)}
        sx={arrowSx("left")}
      >
        <ChevronLeftIcon />
      </IconButton>
      <IconButton
        aria-label={nextLabel}
        disabled={active === count - 1}
        onClick={() => onStep(1)}
        sx={arrowSx("right")}
      >
        <ChevronRightIcon />
      </IconButton>
    </>
  );
}

const arrowSx = (side: "left" | "right"): SxProps<Theme> => ({
  display: "none",
  [hoverCapableMedia]: { display: "inline-flex" },
  position: "absolute",
  top: "50%",
  [side]: 8,
  transform: "translateY(-50%)",
  width: 44,
  height: 44,
  color: "text.primary",
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  "&.Mui-disabled": { opacity: 0, pointerEvents: "none" },
});

/** The dots: a small mark in a 44px tap area each; the current one is a
 *  wider pill + aria-current — shape, not colour alone. `tone`: "paper"
 *  under the detail's photo, "dark" on the viewer's black. */
export function SlideDots({
  count,
  active,
  onSelect,
  label,
  tone,
}: {
  count: number;
  active: number;
  onSelect: (index: number) => void;
  label: (index: number) => string;
  tone: "paper" | "dark";
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === active;
        return (
          <ButtonBase
            key={index}
            aria-label={label(index + 1)}
            aria-current={isActive ? "true" : undefined}
            onClick={() => onSelect(index)}
            sx={{ width: 44, height: 44, borderRadius: "50%" }}
          >
            <Box
              component="span"
              aria-hidden
              sx={(theme) => ({
                display: "block",
                height: 8,
                width: isActive ? 20 : 8,
                borderRadius: 4,
                bgcolor:
                  tone === "dark"
                    ? isActive
                      ? theme.palette.common.white
                      : alpha(theme.palette.common.white, 0.5)
                    : isActive
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
              })}
            />
          </ButtonBase>
        );
      })}
    </Box>
  );
}
