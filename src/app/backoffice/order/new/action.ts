"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { AppError } from "@/app/lib/errors";
import { getSessionContext } from "@/app/lib/session";
import {
  staffAddCartItemSchema,
  staffUpdateCartItemSchema,
  type StaffAddCartItemInput,
  type StaffUpdateCartItemInput,
} from "@/app/lib/schemas/staffOrderSchema";
import {
  OrderSessionCartService,
  OrderSessionService,
  TableService,
} from "@/app/services";

/**
 * Design doc section 7 ("staff place a new order directly") — the one
 * customer-order code path that authenticates via NextAuth
 * (getSessionContext) instead of a QR-scan cookie, since there's no
 * physical scan involved: a manager is placing this order themselves,
 * from inside the Backoffice. Everything downstream of session
 * creation (Order rows, OrdersAddon rows, status transitions) reuses
 * the exact same OrderSessionService methods a real customer session
 * would — this file's only job is the auth boundary and wiring a
 * chosen tableId into startStaffSession/addItemToCart, which a real
 * scan would otherwise have supplied via the cookie.
 */

const safeStartStaffOrder = toSafeResult(async (tableId: number) => {
  const { userId } = await getSessionContext();
  if (!userId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }

  const table = await TableService.getTableById(tableId);
  return OrderSessionService.startStaffSession(table);
});

export async function startStaffOrderAction(tableId: number) {
  const result = await safeStartStaffOrder(tableId);
  return toActionResult(result);
}

const safeAddStaffCartItem = toSafeResult(
  async (input: StaffAddCartItemInput) => {
    const { userId } = await getSessionContext();
    if (!userId) {
      throw new AppError("You must be signed in.", "UNAUTHORIZED");
    }

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
    const { userId } = await getSessionContext();
    if (!userId) {
      throw new AppError("You must be signed in.", "UNAUTHORIZED");
    }

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
 *  edit dialog) — the staff twin of the customer's updateCartItemAction,
 *  which reads the customer's session cookie instead. */
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
    const { userId } = await getSessionContext();
    if (!userId) {
      throw new AppError("You must be signed in.", "UNAUTHORIZED");
    }

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
  const { userId } = await getSessionContext();
  if (!userId) {
    throw new AppError("You must be signed in.", "UNAUTHORIZED");
  }

  return OrderSessionService.submitStaffOrder(sessionId);
});

export async function submitStaffOrderAction(sessionId: number) {
  const result = await safeSubmitStaffOrder(sessionId);
  const actionResult = toActionResult(result);
  if (actionResult.success) {
    revalidatePath("/backoffice/order");
  }
  return actionResult;
}
