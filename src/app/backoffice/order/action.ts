"use server";

import { revalidatePath } from "next/cache";
import { toActionResult, toSafeResult } from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import { getSessionContext } from "@/app/lib/session";
import { OrderSessionService } from "@/app/services";

const safeAccept = toSafeResult(async (sessionId: number) => {
  const { companyId } = await getSessionContext();
  if (!companyId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }
  return OrderSessionService.acceptCounterSession(sessionId);
});

/** Cashier accepts a Counter QR session — see
 *  OrderSessionService.acceptCounterSession. The customer's page,
 *  polling in the background (OrderMenuView), picks this up within a
 *  few seconds without any push mechanism — see the design
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
  return OrderSessionService.rejectCounterSession(sessionId);
});

/** Cashier rejects a Counter QR session — see
 *  OrderSessionService.rejectCounterSession. No cookie cleanup needed
 *  here: order/page.tsx's resolveCounterSession treats a CANCELLED
 *  session the same as PAID (stops offering it for reuse), so the
 *  customer's next poll/visit naturally falls through to view-only. */
export async function rejectCounterSessionAction(sessionId: number) {
  const result = await safeReject(sessionId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/order");
  }
  return actionResult;
}
