"use client";

import { formatAmount } from "@/app/lib/orderFormat";
import { formatVoidReasonCounts } from "@/app/lib/report/voidReport";
import type { ReportOverview } from "./action";
import { FigureCard, FigureCell } from "./CancelledCard";

/** Items voided · Not charged — items staff took back off the period's
 *  paid bills (lib/order/voids), never part of Sales. Under the count,
 *  why: "Wrong item 2 · Other 1" (non-zero reasons only, in words). The
 *  money is neutral: nothing was received (DESIGN.md Rule 13). */
export default function VoidedCard({
  voided,
}: {
  voided: ReportOverview["current"]["voided"];
}) {
  return (
    <FigureCard title="Voided items">
      <FigureCell
        label="Items voided"
        value={String(voided.count)}
        detail={formatVoidReasonCounts(voided.reasons) || undefined}
      />
      <FigureCell label="Not charged" value={formatAmount(voided.value)} />
    </FigureCard>
  );
}
