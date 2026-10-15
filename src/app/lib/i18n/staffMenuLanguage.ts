import type { AppLocale } from "./locale";

/**
 * Staff New Order's EN | မြန်မာ choice for the menu side, remembered per
 * device (localStorage). Display only — never part of the stored cart or
 * the order sent. Pure.
 */
export const STAFF_MENU_LANGUAGE_KEY = "staffMenuLang:v1";

/** A stored value as a language: "my" only when that's what's stored,
 *  anything else (nothing, garbage, an old value) → English. */
export function parseStaffMenuLanguage(raw: string | null): AppLocale {
  return raw === "my" ? "my" : "en";
}
