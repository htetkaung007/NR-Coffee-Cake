"use client";

import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

// Opening a row: the panel fades in with a 4px slide — transform and
// opacity only, no height animation (DESIGN.md Rule 2); ≤200ms, ease-out.
// Closing is immediate: the response to a tap should never wait.
const panelIn = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
`;
const OPEN_MS = 160;

/** The region under an expanded row (an item's or an add-on's pairing). */
export default function ExpandedPanel({
  id,
  label,
  children,
}: {
  id: string;
  /** What the region is, for a screen reader. */
  label: string;
  children: ReactNode;
}) {
  return (
    <Box
      id={id}
      role="region"
      aria-label={label}
      sx={{
        borderTop: 1,
        borderColor: "divider",
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
        animation: `${panelIn} ${OPEN_MS}ms ease-out`,
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      {children}
    </Box>
  );
}

/** The ▾ on an expandable row; turns upside-down when open (transform
 *  only, 150ms). Decorative — the row's button carries aria-expanded. */
export function RowChevron({ expanded }: { expanded: boolean }) {
  return (
    <ExpandMoreIcon
      aria-hidden
      fontSize="small"
      sx={{
        color: "text.secondary",
        transform: expanded ? "rotate(180deg)" : "none",
        transition: "transform 150ms ease-out",
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    />
  );
}
