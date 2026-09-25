"use client";

import Link from "next/link";
import { Button } from "@mui/material";

interface OrderMoreButtonProps {
  /** Where "Order more" lands — the menu, with the same locationId /
   *  tableId the page was opened with. */
  menuHref: string;
  /** Counter QR only: used to be "the current round is already in the
   *  kitchen, so ordering more means starting a new round first" — now
   *  the next round is started LAZILY, on the first item actually
   *  added on the menu page (see OrderSessionService.
   *  getOrStartCartRound), not by this button, so both branches below
   *  render the exact same thing. Table QR's own branch (startNewRound
   *  false/omitted) is untouched — kept as its own branch rather than
   *  collapsing the two, so this diff can't be read as touching
   *  Table's path at all. */
  startNewRound?: boolean;
}

export default function OrderMoreButton({
  menuHref,
  startNewRound = false,
}: OrderMoreButtonProps) {
  if (!startNewRound) {
    return (
      <Button
        component={Link}
        href={menuHref}
        variant="contained"
        fullWidth
        sx={{ borderRadius: 999, py: 1.25 }}
      >
        Order more
      </Button>
    );
  }

  // Counter QR: no server call anymore (see the prop comment above) —
  // just navigate, same as Table's branch above.
  return (
    <Button
      component={Link}
      href={menuHref}
      variant="contained"
      fullWidth
      sx={{ borderRadius: 999, py: 1.25 }}
    >
      Order more
    </Button>
  );
}
