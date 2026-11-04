"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useMediaQuery } from "@mui/material";
import { activeSlideFromScroll, stepSlide } from "@/app/lib/menu/carousel";
import { reducedMotionQuery } from "@/app/lib/theme/sharedThemeTokens";

/**
 * A scroll-snap row of `count` full-width slides (the menu photos — the
 * detail's small carousel and the full-screen viewer, DESIGN.md §18):
 * which slide is showing (read once per frame while it scrolls — a
 * swipe, a dot, an arrow all just scroll the row), going to a slide
 * (smooth, or a plain jump under reduced motion), ←/→ keys, and starting
 * at `startIndex` without any animation. Put `scrollerRef` and
 * `handleScroll` on the row (components/orderUI/menuDetail/PhotoCarousel
 * SnapRow).
 */
export function useSlideScroller(count: number, startIndex = 0) {
  const reducedMotion = useMediaQuery(reducedMotionQuery);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pendingFrame = useRef<number | null>(null);
  const [active, setActive] = useState(startIndex);
  const initialIndex = useRef(startIndex);

  // Opens at the given slide before the first paint — never a slide
  // across from the first.
  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (scroller && initialIndex.current > 0) {
      scroller.scrollLeft = initialIndex.current * scroller.clientWidth;
    }
  }, []);

  useEffect(
    () => () => {
      if (pendingFrame.current !== null) {
        cancelAnimationFrame(pendingFrame.current);
      }
    },
    [],
  );

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

  /** To a slide — smooth, or `instant` (and always under reduced motion). */
  function goTo(index: number, { instant = false } = {}) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({
      left: index * scroller.clientWidth,
      behavior: instant || reducedMotion ? "auto" : "smooth",
    });
    if (instant) setActive(index);
  }

  function step(direction: -1 | 1) {
    goTo(stepSlide(active, direction, count));
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    step(event.key === "ArrowLeft" ? -1 : 1);
  }

  return { scrollerRef, active, handleScroll, goTo, step, handleKeyDown };
}
