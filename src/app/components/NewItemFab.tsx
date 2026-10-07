"use client";

import Link from "next/link";
import { Box, Fab } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

/** MUI's default (large) Fab. */
const FAB_SIZE_PX = 56;
/** Gap between the FAB and the screen's right / bottom edges. */
const FAB_OFFSET_PX = 16;

/** Space a page needs at its bottom, where the FAB shows, so its last
 *  row can scroll clear of the FAB: the FAB's height + its offset + the
 *  iOS home-indicator inset (DESIGN.md Rule 19). */
const FAB_CLEARANCE = `calc(${FAB_SIZE_PX + FAB_OFFSET_PX}px + env(safe-area-inset-bottom, 0px))`;

/** The breakpoint from which the page shows its own "New …" button
 *  instead, so the FAB (and its spacer) disappear. */
type HideFrom = "sm" | "md" | "lg";

/**
 * The Backoffice's floating "+" for creating a new item (menu, menu
 * category, add-on group) on narrow screens — a link to a create page
 * (`href`), or a button opening a create dialog (`onClick`) — fixed at
 * the bottom-right above the safe-area inset. Pair it with
 * NewItemFabSpacer at the end of the page content.
 */
export default function NewItemFab({
  label,
  hideFrom,
  ...target
}: {
  label: string;
  hideFrom: HideFrom;
} & ({ href: string } | { onClick: () => void })) {
  const action =
    "href" in target
      ? { component: Link, href: target.href }
      : { onClick: target.onClick };
  return (
    <Fab
      {...action}
      color="primary"
      aria-label={label}
      sx={{
        display: { xs: "flex", [hideFrom]: "none" },
        position: "fixed",
        right: FAB_OFFSET_PX,
        bottom: `calc(${FAB_OFFSET_PX}px + env(safe-area-inset-bottom, 0px))`,
      }}
    >
      <AddIcon />
    </Fab>
  );
}

/** Bottom padding for a page with a NewItemFab — on the same
 *  breakpoints the FAB shows — so the last row isn't left under it. */
export function NewItemFabSpacer({ hideFrom }: { hideFrom: HideFrom }) {
  return (
    <Box
      aria-hidden
      sx={{
        display: { xs: "block", [hideFrom]: "none" },
        height: FAB_CLEARANCE,
      }}
    />
  );
}
