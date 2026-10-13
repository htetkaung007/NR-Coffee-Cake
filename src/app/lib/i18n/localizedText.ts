/**
 * Shop data (menu, category, add-on names…) in the customer's language:
 * the Myanmar text when the customer chose Myanmar AND there is one (not
 * empty after trimming); otherwise the English text, which is always
 * there. Never used for stored history snapshots. Pure, client-safe.
 */
export function localizedText(
  locale: string,
  en: string,
  my: string | null | undefined,
): string {
  return locale === "my" && my != null && my.trim() !== "" ? my : en;
}
