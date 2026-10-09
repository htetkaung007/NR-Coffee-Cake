"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { requirePermission, requireStaff } from "@/app/lib/access/roleGuard";
import {
  rejectRoundSchema,
  type RejectRound,
  type RejectRoundInput,
} from "@/app/lib/schemas/rejectRoundSchema";
import {
  LocationService,
  OrderApprovalService,
  OrderListService,
  OrderPaymentService,
} from "@/app/services";

const safeGetPendingApprovals = toSafeResult(async () => {
  const { companyId, userId } = await requireStaff();
  const selectedLocation = await LocationService.getSelectedLocation(
    userId,
    companyId,
  );
  // No location chosen yet: nothing can be pending there — the pages
  // themselves already tell the user to pick one.
  if (!selectedLocation) return [];
  return OrderListService.getPendingApprovalSummary(
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
  // The round must be the company's — and, for a manager, at their own
  // location (OrderApprovalService checks with the scope).
  const scope = await requireStaff({ withLocation: true });
  return OrderApprovalService.acceptCounterSession(sessionId, scope);
});

/** Cashier accepts a Counter QR session — see
 *  OrderApprovalService.acceptCounterSession. The customer's page,
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
  const scope = await requireStaff({ withLocation: true });
  return OrderApprovalService.rejectCounterSession(
    input.sessionId,
    scope,
    input.details,
  );
});

/** Cashier rejects a Counter QR session — see
 *  OrderApprovalService.rejectCounterSession. No cookie cleanup needed
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
  // Taking money: the owner, or a manager the owner let mark bills paid.
  const scope = await requirePermission("ORDERS_MARK_PAID", {
    withLocation: true,
  });
  return OrderPaymentService.markSessionsPaid(sessionIds, scope);
});

/** Whole-entry version for the grouped Order List (see
 *  OrderPaymentService.markSessionsPaid) — one confirm click
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
