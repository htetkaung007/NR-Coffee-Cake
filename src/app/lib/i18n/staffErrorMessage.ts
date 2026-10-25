import type { AppLocale } from "./locale";

/**
 * Staff screens show an action's error in the staff's language. English:
 * the server's own message, as it always was (the Services' English is
 * the English wording, and often names exactly what's wrong). Myanmar:
 * the error's stable `code` (bo.errors.<CODE> in messages/*.json) with
 * its `params` filled in — never the English `message`; an unknown code
 * (and anything unexpected, INTERNAL_ERROR) reads bo.errors.generic.
 * Pure.
 */

/** Every error code a staff action, page or route can return that has
 *  its own words. Anything else reads bo.errors.generic in Myanmar. */
export const STAFF_ERROR_CODES = [
  "VALIDATION_ERROR",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NO_SELECTED_LOCATION",
  "SIGNUP_CLOSED",
  "OUT_OF_STOCK",
  "LOW_STOCK",
  "ADDON_UNAVAILABLE",
  "ADDON_UNAVAILABLE_UNNAMED",
  "ADDON_REQUIRED",
  "MENU_NOT_AVAILABLE_HERE",
  "ROUND_CLOSED",
  "EMAIL_TAKEN",
  "LOCATION_HAS_SALES",
  "LOCATION_HAS_MANAGERS",
  "LOCATION_CLOSED",
  "MANAGER_ALREADY_THERE",
  "MANAGER_CANT_SWITCH",
  "CATEGORY_NAME_TAKEN",
  "CATEGORY_MENUS_CHANGED",
  "MENU_NEEDS_CATEGORY",
  "CATEGORY_LIST_CHANGED",
  "CONFLICT",
  "ADDON_GROUP_NAME_TAKEN",
  "NOT_AWAITING_APPROVAL",
  "ALREADY_PAID",
  "BILL_CLOSED",
  "VOID_ONE_LINE",
  "VOID_NONE_LEFT",
  "VOID_ONLY_LEFT",
  "VOID_NOT_ACCEPTED",
  "COUNTER_EXISTS",
  "COUNTER_NAME_FIXED",
  "NO_ACCESS_KEY",
  "MENU_NEEDS_LOCATION",
  "IMAGE_INVALID",
] as const;

type StaffErrorCode = (typeof STAFF_ERROR_CODES)[number];

function isStaffErrorCode(code: string): code is StaffErrorCode {
  return (STAFF_ERROR_CODES as readonly string[]).includes(code);
}

/** The bo.errors namespace's translator, as this helper needs it. */
export type StaffErrorTranslator = (
  key: StaffErrorCode | "generic",
  values?: Record<string, string | number>,
) => string;

/** An action error in the staff's words. */
export function staffErrorMessage(
  error: { message: string; code: string; params?: Record<string, string | number> },
  locale: AppLocale,
  t: StaffErrorTranslator,
): string {
  if (locale === "en") return error.message;
  return isStaffErrorCode(error.code) ? t(error.code, error.params) : t("generic");
}
