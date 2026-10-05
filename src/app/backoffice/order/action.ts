"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import {
  rejectRoundSchema,
  type RejectRound,
  type RejectRoundInput,
} from "@/app/lib/schemas/rejectRoundSchema";
import { getSessionContext } from "@/app/lib/session";
import { LocationService, OrderSessionApprovalService } from "@/app/services";

const safeGetPendingApprovals = toSafeResult(async () => {
  const { companyId, userId } = await getSessionContext();
  if (!companyId || !userId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  const selectedLocation = await LocationService.getSelectedLocation(userId);
  // No location chosen yet: nothing can be pending there — the pages
  // themselves already tell the user to pick one.
  if (!selectedLocation) return [];
  return OrderSessionApprovalService.getPendingApprovalSummary(
    selectedLocation.locationId,
  );
});

/** Read-only poll behind the Backoffice-wide new-order alerts
 *  (OrderAlertsProvider) — rounds awaiting approval at the user's
 *  selected location. See getPendingApprovalSummary. */
export async function getPendingApprovalsAction() {
  const result = await safeGetPendingApprovals();
  return toActionResult(result);
}

const safeAccept = toSafeResult(async (sessionId: number) => {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  return OrderSessionApprovalService.acceptCounterSession(sessionId);
});

/** Cashier accepts a Counter QR session — see
 *  OrderSessionApprovalService.acceptCounterSession. The customer's page,
 *  polling in the background (CounterOrderClient), picks this up
 *  within a few seconds without any push mechanism — see the design
 *  discussion's polling-vs-websocket tradeoff for why that's enough
 *  at this scale. */
export async function acceptCounterSessionAction(sessionId: number) {
  const result = await safeAccept(sessionId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/order");
  }
  return actionResult;
}

const safeReject = toSafeResult(async (input: RejectRound) => {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  return OrderSessionApprovalService.rejectCounterSession(
    input.sessionId,
    input.details,
  );
});

/** Cashier rejects a Counter QR session — see
 *  OrderSessionApprovalService.rejectCounterSession. No cookie cleanup needed
 *  here: this is the cashier's browser, not the customer's — the
 *  customer's own next poll (pollOrderStatusAction) is what clears
 *  their cookie once it sees the resulting CANCELLED status. The
 *  cashier's reason must be one of RejectReason's values; a note is only
 *  accepted with Other (see rejectRoundSchema). */
export async function rejectCounterSessionAction(input: RejectRoundInput) {
  const result = await validateWith(rejectRoundSchema, input).asyncAndThen(
    safeReject,
  );
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/order");
  }
  return actionResult;
}

const safeMarkEntryPaid = toSafeResult(async (sessionIds: number[]) => {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  return OrderSessionApprovalService.markSessionsPaid(sessionIds);
});

/** Whole-entry version for the grouped Order List (see
 *  OrderSessionApprovalService.markSessionsPaid) — one confirm click
 *  settles every open round of a table's tab at once, rather than the
 *  cashier repeating Mark-as-Paid per round. */
export async function markEntryPaidAction(sessionIds: number[]) {
  const result = await safeMarkEntryPaid(sessionIds);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/order");
  }
  return actionResult;
}
