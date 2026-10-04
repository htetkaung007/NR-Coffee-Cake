"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import {
  COUNTER_SESSION_COOKIE,
  counterSessionCookieOptions,
} from "@/app/lib/orderSessionCookie";
import {
  submitCartSchema,
  submittedOutcomeSchema,
  type SubmittedOutcomeInput,
  validateCartSchema,
  type SubmitCartInput,
  type SubmitCartRawInput,
  type ValidateCartInput,
  type ValidateCartRawInput,
} from "@/app/lib/schemas/customerOrderSchema";
import { CartSubmitService, CartValidationService } from "@/app/services";
import { config } from "@/app/utils/config";

const url = config.orderAppUrl;

const safeValidateCart = toSafeResult(async (input: ValidateCartInput) => {
  const store = await cookies();
  const cookieToken = store.get(COUNTER_SESSION_COOKIE)?.value ?? null;
  const [validation, sendState] = await Promise.all([
    CartValidationService.validate(input.locationId, input.lines),
    CartSubmitService.getSendState(input.locationId, cookieToken),
  ]);
  return { ...validation, sendState };
});

/** Checks a browser-held cart (Counter and Online) against the
 *  location's current menu, stock and prices — when the cart page opens
 *  or regains focus, and again before submit — and says whether this
 *  browser could send it now (`sendState`, from the Counter scan
 *  cookie). Read-only: writes nothing, not even the cookie. No session
 *  required (Online browsing has none); the location must exist and be
 *  active (see CartValidationService.loadCatalog). */
export async function validateCartAction(input: ValidateCartRawInput) {
  const result = await validateWith(validateCartSchema, input).asyncAndThen(
    safeValidateCart,
  );
  return toActionResult(result);
}

/** Reads the Counter scan cookie, submits, and — when the order went
 *  onto a new round of the bill — moves the cookie onto that round, so
 *  the customer's next poll follows the order they just placed. The
 *  token itself never goes back to the client. */
const safeSubmitCart = toSafeResult(async (input: SubmitCartInput) => {
  const store = await cookies();
  const cookieToken = store.get(COUNTER_SESSION_COOKIE)?.value ?? null;

  const result = await CartSubmitService.submit({
    ...input,
    sessionToken: cookieToken,
  });
  if (result.status !== "submitted") return result;

  const { sessionToken, ...submitted } = result;
  if (sessionToken !== cookieToken) {
    store.set(COUNTER_SESSION_COOKIE, sessionToken, counterSessionCookieOptions);
  }
  return submitted;
});

/** Submits a browser-held Counter cart — see CartSubmitService.submit.
 *  Safe to retry with the same clientRequestId: a repeat returns the
 *  order the first call created. */
export async function submitCartAction(input: SubmitCartRawInput) {
  const result = await validateWith(submitCartSchema, input).asyncAndThen(
    safeSubmitCart,
  );
  const actionResult = toActionResult(result);
  if (actionResult.success && actionResult.data.status === "submitted") {
    // The order menu, as the Counter submit has always refreshed.
    revalidatePath(`${url}/menu`);
  }
  return actionResult;
}

const safeGetSubmittedOutcome = toSafeResult((input: SubmittedOutcomeInput) =>
  CartSubmitService.getSubmittedOutcome(input.clientRequestId),
);

/** What became of the order this browser last sent (by its request id):
 *  the cart page asks when it opens with a remembered submission, to
 *  show "wasn't accepted" and put the items back even if the customer
 *  wasn't watching when it happened. Read-only; no session needed. */
export async function getSubmittedOrderOutcomeAction(input: {
  clientRequestId: string;
}) {
  const result = await validateWith(submittedOutcomeSchema, input).asyncAndThen(
    safeGetSubmittedOutcome,
  );
  return toActionResult(result);
}
