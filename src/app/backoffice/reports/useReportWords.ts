import { useLocale, useTranslations } from "next-intl";
import { dateNamesFor, reportWords } from "@/app/lib/report/reportWords";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";

/** The Reports words in the staff's language (lib/report/reportWords) —
 *  the Reports page and the printable report alike. */
export function useReportWords() {
  const t = useTranslations("bo.reports");
  const locale = useLocale();
  const money = useStaffMoney();
  return reportWords((key, values) => t(key, values), dateNamesFor(locale), money.amount);
}

/** "Out of stock 1 · Looks fake 2" / "Wrong item 2 · Other 1" pairs in
 *  the staff's language — for formatRejectReasonCounts /
 *  formatVoidReasonCounts. */
export function useReasonCountLabels() {
  const t = useTranslations("bo.reports");
  const tReject = useTranslations("bo.rejectReasonShort");
  const tVoid = useTranslations("bo.voidReason");
  return {
    reject: (reason: Parameters<typeof tReject>[0], count: number) =>
      t("reasonCount", { reason: tReject(reason), count }),
    void: (reason: Parameters<typeof tVoid>[0], count: number) =>
      t("reasonCount", { reason: tVoid(reason), count }),
  };
}
