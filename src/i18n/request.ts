import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  APP_SURFACE_HEADER,
  localeForSurface,
  parseAppSurface,
} from "@/app/lib/i18n/backofficeLocale";
import { config } from "@/app/utils/config";

/**
 * next-intl's per-request config — WITHOUT i18n routing (no /[locale]
 * segment, nothing in the URL or QR links). Two languages live side by
 * side, each in its own cookie, read here on the server so the first
 * render is already right (lib/i18n/backofficeLocale):
 * - the staff surface (/backoffice, /print, /auth — the proxy marks it
 *   with the x-app-surface header): BO_LOCALE, default English;
 * - every other page (the storefront): NEXT_LOCALE, default Myanmar.
 */
export default getRequestConfig(async () => {
  const surface = parseAppSurface((await headers()).get(APP_SURFACE_HEADER));
  const store = await cookies();
  const locale = localeForSurface(surface, (name) => store.get(name)?.value);
  return {
    locale,
    // Dates are shop-time everywhere (lib/shopDay) — the same here.
    timeZone: config.shopTimezone,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
