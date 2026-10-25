import { percentOf } from "./percent";

/** Below this many viewers a rate says more about chance than about the
 *  menu, so none is shown. */
export const MIN_VIEWERS_FOR_RATE = 10;

/** One menu's view → order funnel for a period, as Reports' Items tab
 *  shows it. Every field null = the period has no view data (it started
 *  before menu views were counted) — shown as "—", never 0. */
export interface ViewFunnel {
  viewers: number | null;
  orderers: number | null;
  viewedNotOrdered: number | null;
  /** Orderers as a percent of viewers (one decimal, at most 100); null
   *  under MIN_VIEWERS_FOR_RATE viewers. */
  rate: number | null;
}

/**
 * From a menu's viewers (customers who opened its detail on a QR phone,
 * one per customer per day — MenuViewDaily) and orderers (customers who
 * ordered it, one per customer per day — ReportService), pure.
 * `viewers: null` = no view data for the period. More orderers than
 * viewers can happen (a cart built before the phone's QR scan was never
 * counted as a view), so "viewed, not ordered" stops at 0 and the rate
 * at 100%.
 */
export function viewFunnel({
  viewers,
  orderers,
}: {
  viewers: number | null;
  orderers: number;
}): ViewFunnel {
  if (viewers === null) {
    return { viewers: null, orderers: null, viewedNotOrdered: null, rate: null };
  }
  return {
    viewers,
    orderers,
    viewedNotOrdered: Math.max(0, viewers - orderers),
    rate:
      viewers < MIN_VIEWERS_FOR_RATE
        ? null
        : Math.min(100, percentOf(orderers, viewers, 1)),
  };
}
