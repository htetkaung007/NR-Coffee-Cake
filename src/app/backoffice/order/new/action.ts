"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { requireStaff } from "@/app/lib/access/roleGuard";
import {
  staffAddCartItemSchema,
  staffUpdateCartItemSchema,
  type StaffAddCartItemInput,
  type StaffUpdateCartItemInput,
} from "@/app/lib/schemas/staffOrderSchema";
import { OrderSessionCartService, StaffOrderService, TableService } from "@/app/services";

/**
 * Design doc section 7 ("staff place a new order directly") — the one
 * customer-order code path that authenticates via NextAuth
 * (requireStaff — the session) instead of a QR-scan cookie, since there's no
 * physical scan involved: a manager is placing this order themselves,
 * from inside the Backoffice. Everything downstream of session
 * creation (Order rows, OrdersAddon rows, status transitions) reuses
 * the exact same OrderSessionService methods a real customer session
 * would — this file's only job is the auth boundary and wiring a
 * chosen tableId into startStaffSession/addItemToCart, which a real
 * scan would otherwise have supplied via the cookie.
 */

const safeStartStaffOrder = toSafeResult(async (tableId: number) => {
  await requireStaff();

  const table = await TableService.getTableById(tableId);
  return StaffOrderService.startStaffSession(table);
});

export async function startStaffOrderAction(tableId: number) {
  const result = await safeStartStaffOrder(tableId);
  return toActionResult(result);
}

const safeAddStaffCartItem = toSafeResult(
  async (input: StaffAddCartItemInput) => {
    await requireStaff();

    // The same cart method (and so the same note handling and line-merge
    // rule) the customer flow uses.
    return OrderSessionCartService.addItemToCart(
      input.sessionId,
      input.tableId,
      input.menuId,
      input.quantity,
      input.addonIds,
      input.note,
    );
  },
);

export async function addStaffCartItemAction(
  sessionId: number,
  tableId: number,
  menuId: number,
  quantity: number,
  addonIds: number[] = [],
  note?: string,
) {
  const result = await validateWith(staffAddCartItemSchema, {
    sessionId,
    tableId,
    menuId,
    quantity,
    addonIds,
    note,
  }).asyncAndThen(safeAddStaffCartItem);
  return toActionResult(result);
}

const safeUpdateStaffCartItem = toSafeResult(
  async (input: StaffUpdateCartItemInput) => {
    await requireStaff();

    return OrderSessionCartService.updateItemInCart(
      input.sessionId,
      input.orderId,
      input.quantity,
      input.addonIds,
      input.note,
    );
  },
);

/** A line's quantity (the − / + stepper) or its add-ons and note (the
 *  edit dialog) of the staff's server-held cart (the Counter customer's
 *  cart lives in their browser instead — see useBrowserCart). */
export async function updateStaffCartItemAction(
  sessionId: number,
  orderId: number,
  quantity: number,
  addonIds: number[] = [],
  note?: string,
) {
  const result = await validateWith(staffUpdateCartItemSchema, {
    sessionId,
    orderId,
    quantity,
    addonIds,
    note,
  }).asyncAndThen(safeUpdateStaffCartItem);
  return toActionResult(result);
}

const safeRemoveStaffCartItem = toSafeResult(
  async (input: { sessionId: number; orderId: number }) => {
    await requireStaff();

    return OrderSessionCartService.removeItemFromCart(
      input.sessionId,
      input.orderId,
    );
  },
);

export async function removeStaffCartItemAction(
  sessionId: number,
  orderId: number,
) {
  const result = await safeRemoveStaffCartItem({ sessionId, orderId });
  return toActionResult(result);
}

const safeSubmitStaffOrder = toSafeResult(async (sessionId: number) => {
  await requireStaff();

  return StaffOrderService.submitStaffOrder(sessionId);
});

export async function submitStaffOrderAction(sessionId: number) {
  const result = await safeSubmitStaffOrder(sessionId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/order");
  }
  return actionResult;
}
