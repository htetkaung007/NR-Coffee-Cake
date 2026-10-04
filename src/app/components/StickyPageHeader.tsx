"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Box } from "@mui/material";
import {
  backofficePageTop,
  topBarHeight,
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

  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const root = document.documentElement;
    const update = () => {
      const top = parseFloat(getComputedStyle(header).top) || 0;
      root.style.scrollPaddingTop = `${top + header.offsetHeight}px`;
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => {
      observer.disconnect();
      root.style.scrollPaddingTop = "";
    };
  }, []);

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
          ? { mt: negated(backofficePageTop), pt: backofficePageTop, pb: 1.5 }
          : { py: 1 }),
        // xs: none of its own — BackofficeShell's gutter already applies.
        px: { xs: 0, sm: 2, md: 3 },
      })}
    >
      {children}
    </Box>
  );
}
