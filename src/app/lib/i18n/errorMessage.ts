/**
 * Customer screens show an action's error in the customer's language:
 * by its stable `code` (errors.<CODE> in messages/*.json), with the
 * error's `params` (names, counts) filled in. An unknown code — and
 * anything unexpected (INTERNAL_ERROR) — shows the generic message. The
 * English `message` from the server is never shown on a customer screen,
 * so no internal id, token or stack text can leak through it. Pure.
 */

/** Every error code a customer-facing action or route can return that
 *  has its own words. Anything else reads errors.generic. */
export const CUSTOMER_ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "SHOP_UNAVAILABLE",
  "NO_SESSION",
  "TABLE_SESSION_CLOSED",
  "NO_WAITING_ORDER",
  "WITHDRAW_NOT_SENT",
  "ROUND_ALREADY_ACCEPTED",
  "ROUND_ALREADY_CANCELLED",
  "ROUND_EXPIRED",
  "DRAFT_NOT_FOUND",
  "DRAFT_NOT_YOURS",
  "NOTHING_TO_SUBMIT",
  "ADDON_UNAVAILABLE",
  "ADDON_UNAVAILABLE_UNNAMED",
  "ADDON_REQUIRED",
  "MENU_NOT_AVAILABLE_HERE",
  "OUT_OF_STOCK",
  "LOW_STOCK",
  "ROUND_NOT_CONFIRMED",
  "ROUND_AWAITING_APPROVAL",
  "ROUND_CLOSED",
] as const;

type CustomerErrorCode = (typeof CUSTOMER_ERROR_CODES)[number];

function isCustomerErrorCode(code: string): code is CustomerErrorCode {
  return (CUSTOMER_ERROR_CODES as readonly string[]).includes(code);
}

/** The errors namespace's translator, as this helper needs it. */
export type ErrorTranslator = (
  key: CustomerErrorCode | "generic",
  values?: Record<string, string | number>,
) => string;

/** An action error in the customer's words. */
export function customerErrorMessage(
  error: { code: string; params?: Record<string, string | number> },
  t: ErrorTranslator,
): string {
  return isCustomerErrorCode(error.code) ? t(error.code, error.params) : t("generic");
}
