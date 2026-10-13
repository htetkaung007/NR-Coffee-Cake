import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { LOCALE_COOKIE, parseLocale } from "@/app/lib/i18n/locale";
import { config } from "@/app/utils/config";

/**
 * next-intl's per-request config — WITHOUT i18n routing (no /[locale]
 * segment, nothing in the URL or QR links). The customer's language is
 * the NEXT_LOCALE cookie, read here on the server so the first render is
 * already right; missing or invalid → Myanmar (lib/i18n/locale). Only
 * the storefront uses translations; the Backoffice stays English.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = parseLocale(store.get(LOCALE_COOKIE)?.value);
  return {
    locale,
    // Dates are shop-time everywhere (lib/shopDay) — the same here.
    timeZone: config.shopTimezone,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
