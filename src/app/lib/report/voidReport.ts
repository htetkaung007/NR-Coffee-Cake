import { lineTotal } from "../order/orderTotals";
import {
  VOID_REASONS,
  voidReasonLabel,
  type VoidReason,
} from "../order/voids";

/** One void on a paid bill's line, with what it took back: `quantity`
 *  units at the line's own snapshot prices (menu + add-ons per unit). */
export interface ReportVoid {
  reason: VoidReason;
  quantity: number;
  unitPrice: number;
  addonUnitPrices: readonly number[];
}

export interface VoidSummary {
  /** Units voided. */
  count: number;
  /** What those units would have cost (never charged) — the line-total
   *  rule (orderTotals.lineTotal) at the line's snapshot prices. */
  value: number;
  /** Per reason, every reason in VOID_REASONS order (zeros included). */
  reasons: { reason: VoidReason; count: number; value: number }[];
}

/** Reports' "Voided" figure: how many units staff voided off the period's
 *  paid bills, what they were worth, and why. Pure. */
export function summarizeVoids(voids: readonly ReportVoid[]): VoidSummary {
  const byReason = new Map(
    VOID_REASONS.map((reason) => [reason, { reason, count: 0, value: 0 }]),
  );
  for (const entry of voids) {
    const bucket = byReason.get(entry.reason);
    if (!bucket) continue;
    bucket.count += entry.quantity;
    bucket.value += lineTotal(entry.unitPrice, entry.addonUnitPrices, entry.quantity);
  }
  const reasons = [...byReason.values()];
  return {
    count: reasons.reduce((sum, bucket) => sum + bucket.count, 0),
    value: reasons.reduce((sum, bucket) => sum + bucket.value, 0),
    reasons,
  };
}

/** "Wrong item 2 · Other 1" — the non-zero reasons only; "" when none. */
export function formatVoidReasonCounts(summary: VoidSummary["reasons"]): string {
  return summary
    .filter((entry) => entry.count > 0)
    .map((entry) => `${voidReasonLabel(entry.reason)} ${entry.count}`)
    .join(" · ");
}
