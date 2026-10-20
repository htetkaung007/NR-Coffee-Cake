"use client";

import { useTranslations } from "next-intl";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import { useReasonCountLabels } from "./useReportWords";
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
  const t = useTranslations("bo.reports");
  const money = useStaffMoney();
  const reasonLabels = useReasonCountLabels();
  return (
    <FigureCard title={t("voidedTitle")}>
      <FigureCell
        label={t("itemsVoided")}
        value={String(voided.count)}
        detail={formatVoidReasonCounts(voided.reasons, reasonLabels.void) || undefined}
      />
      <FigureCell label={t("notCharged")} value={money.amount(voided.value)} />
    </FigureCard>
  );
}
