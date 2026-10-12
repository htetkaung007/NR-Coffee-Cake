"use server";

import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { requireStaff } from "@/app/lib/access/roleGuard";
import {
  staffSubmitStatusSchema,
  submitStaffOrderSchema,
  validateStaffCartSchema,
  type SubmitStaffOrderRawInput,
} from "@/app/lib/schemas/staffOrderSchema";
import type { CartLineInput } from "@/app/lib/cart/cartValidation";
import {
  CartValidationService,
  OrderListService,
  StaffOrderService,
} from "@/app/services";

/**
 * Design doc section 7 ("staff place a new order directly"). The cart is
 * kept in the browser (lib/cart/staffCart.ts) until "Send to kitchen":
 * two read-only calls — the cart check while it's being built and the
 * tables' In use / Free for the picker — and the one write when it's
 * sent. All authenticate via the staff session (requireStaff), never a
 * QR cookie, and take the location from that session, never from the
 * input.
 */

const safeRequireStaffAtLocation = toSafeResult(() =>
  requireStaff({ withLocation: true }),
);

const safeValidateStaffCart = toSafeResult(
  (input: { locationId: number; lines: CartLineInput[] }) =>
    CartValidationService.validate(input.locationId, input.lines),
);

/** The live check while the order is being built ("Only 1 left", "Sold
 *  out", "Not available", a new price) — against the staff member's own
 *  selected location's menu, stock and prices. Writes nothing. */
export async function validateStaffCartAction(input: {
  lines: CartLineInput[];
}) {
  const result = await safeRequireStaffAtLocation()
    .andThen(({ locationId }) =>
      validateWith(validateStaffCartSchema, input).map((data) => ({
        ...data,
        locationId,
      })),
    )
    .andThen(safeValidateStaffCart);
  return toActionResult(result);
}

const safeSubmitStaffOrder = toSafeResult(StaffOrderService.submitStaffOrder);

/** "Send to kitchen": the whole cart as one PENDING round (staff orders
 *  skip approval). Guard FIRST; the table must be one this staff member
 *  may order for (StaffOrderService). Safe to retry with the same
 *  clientRequestId — a repeat returns the order the first call created.
 *  A shortage or unavailable line comes back with the check and nothing
 *  is written. */
export async function submitStaffOrderAction(input: SubmitStaffOrderRawInput) {
  const result = await safeRequireStaffAtLocation()
    .andThen((scope) =>
      validateWith(submitStaffOrderSchema, input).map((data) => ({
        ...data,
        scope,
      })),
    )
    .andThen(safeSubmitStaffOrder);

  const actionResult = toActionResult(result);
  if (actionResult.success && actionResult.data.status === "submitted") {
    revalidatePath("/backoffice/order");
  }
  return actionResult;
}

const safeGetStaffSubmitStatus = toSafeResult(
  StaffOrderService.getSubmitStatus,
);

/** After a send whose answer never arrived: did that order reach the
 *  kitchen? Looks the request id up only among rounds at the staff
 *  member's own selected location (StaffOrderService.getSubmitStatus).
 *  Read-only; guard FIRST. */
export async function getStaffSubmitStatusAction(clientRequestId: string) {
  const result = await safeRequireStaffAtLocation()
    .andThen((scope) =>
      validateWith(staffSubmitStatusSchema, { clientRequestId }).map(
        (data) => ({ ...data, scope }),
      ),
    )
    .andThen(({ clientRequestId: requestId, scope }) =>
      safeGetStaffSubmitStatus(requestId, scope),
    );
  return toActionResult(result);
}

const safeGetTableOccupancy = toSafeResult(async () => {
  const { locationId } = await requireStaff({ withLocation: true });
  return OrderListService.getTableOccupancy(locationId);
});

/** Which tables are In use / Free at the staff member's own selected
 *  location — for the "Order for" picker when it opens. Read-only; the
 *  location comes from the session, never the input. */
export async function getTableOccupancyAction() {
  return toActionResult(await safeGetTableOccupancy());
}
