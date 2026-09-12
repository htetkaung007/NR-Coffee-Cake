"use client";

import { Chip } from "@mui/material";

const ROUND_STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Awaiting counter approval",
  PENDING: "Confirmed — cooking soon",
  COOKING: "Cooking",
};

export interface ActiveRound {
  orderNumber: string;
  status: string;
}

/** Shown on both TableOrderClient (browsing) and TableCartPageClient
 *  (draft review) — a table can have an already-submitted round
 *  cooking AND a fresh draft being built for the next one at the same
 *  time (see the design discussion), so this is deliberately just a
 *  read-only status chip, separate from whatever the draft's own
 *  Send-to-Kitchen button is doing. */
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
