"use client";

import type { ReportPeriodKind } from "@/app/lib/reportPeriod";
import { getReportItemsAction, type ReportItems } from "./action";
import { useKeyedResource, type ResourceState } from "./useKeyedResource";

export type ItemsState = ResourceState<ReportItems>;

/**
 * The Items report for one period, fetched in the background once the
 * period is known — the Overview never waits for it (its two sellers
 * previews and the Items tab share this one fetch), and a period already
 * seen isn't fetched again (see useKeyedResource). `startDay` null means
 * no period yet (the Overview itself failed) — nothing is fetched.
 */
export function useReportItems(
  kind: ReportPeriodKind,
  startDay: string | null,
) {
  return useKeyedResource(
    startDay === null ? null : `${kind}:${startDay}`,
    () => getReportItemsAction({ kind, anchorDay: startDay! }),
  );
}
