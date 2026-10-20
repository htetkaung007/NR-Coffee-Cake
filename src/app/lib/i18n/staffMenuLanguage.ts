import type { AppLocale } from "./locale";

/**
 * The staff screens' per-device EN | မြန်မာ preview choices, remembered
 * in localStorage — display only, never part of anything stored on the
 * server: staff New Order's menu side (never part of the stored cart or
 * the order sent) and the print preview's voucher language. Pure.
 */
export const STAFF_MENU_LANGUAGE_KEY = "staffMenuLang:v1";

/** The print preview's voucher language (receipts and bills). */
export const VOUCHER_LANGUAGE_KEY = "printVoucherLang:v1";

/** A stored value as a language: "my" or "en" when that's what's
 *  stored; anything else (nothing, garbage, an old value) → `fallback` —
 *  the staff's own Backoffice language (BO_LOCALE), English by default. */
export function parseStoredLanguage(
  raw: string | null,
  fallback: AppLocale = "en",
): AppLocale {
  return raw === "my" || raw === "en" ? raw : fallback;
}
