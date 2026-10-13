"use client";

import { Chip } from "@mui/material";
import { useCustomerLabels } from "@/app/lib/hooks/useCustomerLabels";
import type { ApprovalTiming } from "@/app/lib/approval/approvalTiming";

export interface ActiveRound {
  orderNumber: string;
  status: string;
  /** Filled by the cart flows (not the menu page): the round's id — for
   *  its receipt link and to recognise "the round I was waiting on" —
   *  and its billing total. */
  id?: number;
  total?: number;
  /** Awaiting approval only: the soft countdown (server clock) — a
   *  Table round's target is one approval window after it was sent; past
   *  it the round is overdue but never cancelled. Null when not waiting. */
  approval?: ApprovalTiming | null;
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
  // The same words as the history chips (roundStatus.<STATUS>).
  const labels = useCustomerLabels();
  if (!activeRound) return null;

  return (
    <Chip
      label={`${activeRound.orderNumber} — ${labels.roundStatus(activeRound.status)}`}
      color="success"
      sx={{ mb: 1.5 }}
    />
  );
}
