"use server";

import { revalidatePath } from "next/cache";
import { toActionResult, toSafeResult } from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import { getSessionContext } from "@/app/lib/session";
import { OrderSessionApprovalService } from "@/app/services";

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

const safeReject = toSafeResult(async (sessionId: number) => {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  return OrderSessionApprovalService.rejectCounterSession(sessionId);
});

/** Cashier rejects a Counter QR session — see
 *  OrderSessionApprovalService.rejectCounterSession. No cookie cleanup needed
 *  here: this is the cashier's browser, not the customer's — the
 *  customer's own next poll (pollOrderStatusAction) is what clears
 *  their cookie once it sees the resulting CANCELLED status. */
export async function rejectCounterSessionAction(sessionId: number) {
  const result = await safeReject(sessionId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/order");
  }
  return actionResult;
}

const safeMarkPaid = toSafeResult(async (sessionId: number) => {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  return OrderSessionApprovalService.markSessionPaid(sessionId);
});

/** Cashier marks a session PAID — see OrderSessionApprovalService.markSessionPaid
 *  for why the customer's cookie isn't (and can't be) touched from here;
 *  their next poll/page-load is what clears it. For a Table QR session
 *  this is also what frees the table for the next group on its very
 *  next scan (design doc section 3, rule 3) — no separate "Clear Table"
 *  action needed. */
export async function markSessionPaidAction(sessionId: number) {
  const result = await safeMarkPaid(sessionId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/order");
  }
  return actionResult;
}
