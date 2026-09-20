"use client";

import { Chip } from "@mui/material";

/** Exported so the History page (see /history/page.tsx) can label past
 *  rounds the same way this banner labels the current one, instead of
 *  keeping a second copy that could drift. */
export const ROUND_STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Awaiting counter approval",
  PENDING: "Confirmed — cooking soon",
  COOKING: "Cooking",
};

export interface ActiveRound {
  orderNumber: string;
  status: string;
  /** Filled by the cart flows (not the menu page): the round's id — for
   *  its receipt link and to recognise "the round I was waiting on" —
   *  and its billing total. */
  id?: number;
  total?: number;
}

/** Shown on TableCartPageClient's draft view (not on the menu page,
 *  which is kept to just the menu) — a table can have an already-
 *  submitted round cooking AND a fresh draft being built for the next
 *  one at the same time (see the design discussion), so this is
 *  deliberately just a read-only status chip, separate from whatever
 *  the draft's own Send-to-Kitchen button is doing. */
export default function ActiveRoundBanner({
  activeRound,
}: {
  activeRound: ActiveRound | null;
}) {
  if (!activeRound) return null;

  return (
    <Chip
      label={`${activeRound.orderNumber} — ${
        ROUND_STATUS_LABEL[activeRound.status] ?? activeRound.status
      }`}
      color="success"
      sx={{ mb: 1.5 }}
    />
  );
}
