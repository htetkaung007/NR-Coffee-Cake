"use client";

import {
  useEffect,
  useEffectEvent,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { Box } from "@mui/material";
import {
  backofficePageTop,
  backofficePageTopTouch,
  topBarHeight,
  touchScreenMedia,
} from "@/app/lib/theme/sharedThemeTokens";

const negated = (spacing: typeof backofficePageTop) => ({
  xs: -spacing.xs,
  sm: -spacing.sm,
});

/** The sticky header block of a Backoffice list page (Order History,
 *  Reports): pinned just below the app bar while the content scrolls away
 *  underneath it (DESIGN.md Rule 23 — sticky filters, page scroll, no
 *  nested scroll box).
 *
 *  placement "top" (default): the page's first block, title included —
 *  it sits at the shared page-top gap, and keeps that gap when stuck.
 *  "below-title": only a controls row under a title that scrolls away,
 *  so the pinned area stays short.
 *
 *  While mounted it reserves its own height as the page's scroll padding,
 *  so keyboard focus and in-page jumps never land behind it. */
export default function StickyPageHeader({
  children,
  placement = "top",
}: {
  children: ReactNode;
  placement?: "top" | "below-title";
}) {
  const ref = useRef<HTMLElement | null>(null);
  useStickyScrollPadding([ref]);

  return (
    <Box
      ref={ref}
      component="header"
      sx={(theme) => ({
        position: "sticky",
        top: topBarHeight(theme),
        zIndex: 2,
        // Page surface (cream), so the white cards below read as cards.
        bgcolor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
        ...(placement === "top"
          ? {
              mt: negated(backofficePageTop),
              pt: backofficePageTop,
              pb: 1.5,
              // The shell's smaller touch-screen gap, the same way.
              [touchScreenMedia]: {
                mt: -backofficePageTopTouch,
                pt: backofficePageTopTouch,
              },
            }
          : { py: 1 }),
        // xs: none of its own — BackofficeShell's gutter already applies.
        px: { xs: 0, sm: 2, md: 3 },
      })}
    >
      {children}
    </Box>
  );
}

/** Keeps the page's scroll padding equal to what's pinned under the app
 *  bar, so keyboard focus and in-page jumps never land behind it. Of
 *  `candidates`, the first whose computed position is sticky right now
 *  counts (a header can pin a different box per breakpoint — Reports
 *  pins only its period row on phones); re-measured whenever one of them
 *  resizes, which a breakpoint change does too. */
export function useStickyScrollPadding(
  candidates: RefObject<HTMLElement | null>[],
) {
  // An Effect Event: the caller passes a fresh array of (stable) refs every
  // render; their elements are read once, when the effect mounts.
  const readElements = useEffectEvent(() =>
    candidates
      .map((candidate) => candidate.current)
      .filter((element): element is HTMLElement => element !== null),
  );
  useEffect(() => {
    const elements = readElements();
    if (elements.length === 0) return;
    const root = document.documentElement;
    const update = () => {
      const pinned = elements.find(
        (element) => getComputedStyle(element).position === "sticky",
      );
      if (!pinned) {
        root.style.scrollPaddingTop = "";
        return;
      }
      const top = parseFloat(getComputedStyle(pinned).top) || 0;
      root.style.scrollPaddingTop = `${top + pinned.offsetHeight}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    elements.forEach((element) => observer.observe(element));
    return () => {
      observer.disconnect();
      root.style.scrollPaddingTop = "";
    };
  }, []);
}
