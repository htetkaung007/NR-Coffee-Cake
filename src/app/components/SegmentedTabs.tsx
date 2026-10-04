"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import { isPlainLeftClick } from "@/app/lib/isPlainLeftClick";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

export interface SegmentedItem<Value extends string> {
  value: Value;
  label: string;
  /** With a href the segment is a link (a tab whose state lives in the
   *  URL, DESIGN.md Rule 17); without, a button (a plain toggle). */
  href?: string;
  /** A count pill after the label (Order History's Paid / Cancelled). */
  count?: number;
}

interface SegmentedTabsProps<Value extends string> {
  ariaLabel: string;
  items: SegmentedItem<Value>[];
  value: Value;
  /** For button segments. */
  onSelect?: (value: Value) => void;
  /** For link segments: given, a plain click calls this with the href
   *  instead of following the link, so the parent can navigate inside a
   *  transition. Modified clicks (new tab) still follow the link. */
  onNavigate?: (href: string) => void;
  sx?: SxProps<Theme>;
}

/** One framed row of equal segments, the selected one filled — Order
 *  History's Paid / Cancelled switch, shared with the Reports' Week /
 *  Month and Overview / Items. Full width on phones (easier to tap); from
 *  sm only as wide as its content. A grid of equal columns keeps every
 *  segment the width of the widest label. */
export default function SegmentedTabs<Value extends string>({
  ariaLabel,
  items,
  value,
  onSelect,
  onNavigate,
  sx,
}: SegmentedTabsProps<Value>) {
  const asLinks = items.every((item) => item.href !== undefined);

  return (
    <Box
      role={asLinks ? "tablist" : "group"}
      aria-label={ariaLabel}
      sx={[
        {
          display: "grid",
          gridTemplateColumns: `repeat(${items.length}, 1fr)`,
          width: { xs: "100%", sm: "fit-content" },
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
          p: 0.5,
          gap: 0.5,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {items.map((item) => {
        const selected = item.value === value;
        const segmentSx = (theme: Theme) => ({
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          minHeight: 44,
          px: 1.5,
          border: "none",
          borderRadius: 1.5,
          font: "inherit",
          textDecoration: "none",
          cursor: "pointer",
          color: selected ? "primary.contrastText" : "text.primary",
          bgcolor: selected ? "primary.main" : "transparent",
          transition: "background-color 160ms ease-out, color 160ms ease-out",
          [hoverCapableMedia]: {
            "&:hover": {
              bgcolor: selected ? "primary.main" : theme.palette.action.hover,
            },
          },
          "&:focus-visible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        });
        const content = (
          <>
            {/* Same variant as the Order List's [Open] [History]. */}
            <Typography component="span" variant="button">
              {item.label}
            </Typography>
            {item.count !== undefined && (
              <Box
                component="span"
                sx={(theme) => ({
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 22,
                  minHeight: 22,
                  px: 0.5,
                  borderRadius: "999px",
                  bgcolor: alpha(
                    selected
                      ? theme.palette.primary.contrastText
                      : theme.palette.primary.main,
                    selected ? 0.2 : 0.08,
                  ),
                })}
              >
                <Typography
                  variant="button"
                  component="span"
                  sx={{
                    color: selected ? "primary.contrastText" : "text.secondary",
                  }}
                >
                  {item.count}
                </Typography>
              </Box>
            )}
          </>
        );

        if (item.href !== undefined) {
          const href = item.href;
          return (
            <Box
              key={item.value}
              component={Link}
              href={href}
              role="tab"
              aria-selected={selected}
              onClick={(event: MouseEvent<HTMLElement>) => {
                if (onNavigate && isPlainLeftClick(event)) {
                  event.preventDefault();
                  onNavigate(href);
                }
              }}
              sx={segmentSx}
            >
              {content}
            </Box>
          );
        }
        return (
          <Box
            key={item.value}
            component="button"
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect?.(item.value)}
            sx={segmentSx}
          >
            {content}
          </Box>
        );
      })}
    </Box>
  );
}
