"use client";

import { getReportPairingAction, type ReportPairing } from "./action";
import { useKeyedResource, type ResourceState } from "./useKeyedResource";

export type PairingState = ResourceState<ReportPairing>;

/** The add-on pairing for one calendar month (identified by its first
 *  day), fetched when the Items tab opens and whenever the month changes;
 *  every month already seen is kept. Independent of the page's Week /
 *  Month control. */
export function usePairing(monthStartDay: string) {
  return useKeyedResource(`pairing:${monthStartDay}`, () =>
    getReportPairingAction({ anchorDay: monthStartDay }),
  );
}
