"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import {
  toActionResult,
  toSafeResult,
  validateWith,
} from "@/app/lib/actionHelper";
import { requireStaff } from "@/app/lib/access/roleGuard";
import { LOCALES, localeCookieOptions } from "@/app/lib/i18n/locale";
import { BACKOFFICE_LOCALE_COOKIE } from "@/app/lib/i18n/backofficeLocale";
import { isSecureServerRequest } from "@/app/lib/http/secureCookie";

const setBackofficeLocaleSchema = z.object({ locale: z.enum(LOCALES) });

const safeRequireStaff = toSafeResult(() => requireStaff());

/** The account menu's Language row: sets this device's BO_LOCALE cookie
 *  (the staff's language — never the customers' NEXT_LOCALE) and nothing
 *  else, no user data. Staff only; the client then refreshes, so the
 *  server renders the Backoffice again in the new language. */
export async function setBackofficeLocaleAction(locale: string) {
  const result = await safeRequireStaff().andThen(() =>
    validateWith(setBackofficeLocaleSchema, { locale }),
  );
  if (result.isOk()) {
    const store = await cookies();
    store.set(
      BACKOFFICE_LOCALE_COOKIE,
      result.value.locale,
      localeCookieOptions(await isSecureServerRequest()),
    );
  }
  return toActionResult(result.map(() => null));
}
