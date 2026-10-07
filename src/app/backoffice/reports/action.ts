"use server";

import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { requirePermission } from "@/app/lib/roleGuard";
import { AppError } from "@/app/lib/errors";
import {
  reportPairingInputSchema,
  reportPeriodInputSchema,
  type ReportPairingInput,
  type ReportPeriodInput,
} from "@/app/lib/schemas/reportSchema";
import { LocationService, ReportService } from "@/app/services";

/** Reports: the owner, or a manager the owner let view reports — and
 *  always about the location the user currently has selected, never one
 *  named by the client. Kept local, as in the other action files. */
async function requireReportScope() {
  const { companyId, userId } = await requirePermission("REPORTS_VIEW");

  const selectedLocation = await LocationService.getSelectedLocation(userId);
  if (!selectedLocation) {
    throw new AppError(
      "Select a location before viewing reports.",
      "NO_SELECTED_LOCATION",
    );
  }
  return { companyId, locationId: selectedLocation.locationId };
}

const safeGetItems = toSafeResult(async (input: ReportPeriodInput) => {
  const scope = await requireReportScope();
  return ReportService.getItems({ ...scope, ...input });
});

/** What sold, slow sellers and add-on sales — see ReportService.getItems. */
export async function getReportItemsAction(input: ReportPeriodInput) {
  const result = await validateWith(
    reportPeriodInputSchema,
    input,
  ).asyncAndThen(safeGetItems);
  return toActionResult(result);
}

const safeGetPairing = toSafeResult(async (input: ReportPairingInput) => {
  const scope = await requireReportScope();
  return ReportService.getPairing({ ...scope, ...input });
});

/** Which add-ons go with which menus, for the month containing
 *  anchorDay — see ReportService.getPairing. */
export async function getReportPairingAction(input: ReportPairingInput) {
  const result = await validateWith(
    reportPairingInputSchema,
    input,
  ).asyncAndThen(safeGetPairing);
  return toActionResult(result);
}

/** The data each tab renders — types only, for the page's client
 *  components (a "use server" file may export types). The Overview has
 *  no action: page.tsx loads it through ReportService.getOverview. */
export type ReportOverview = Awaited<ReturnType<typeof ReportService.getOverview>>;
export type ReportItems = Awaited<ReturnType<typeof ReportService.getItems>>;
export type ReportPairing = Awaited<ReturnType<typeof ReportService.getPairing>>;
