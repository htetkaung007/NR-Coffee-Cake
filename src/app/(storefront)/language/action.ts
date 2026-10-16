"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { toActionResult, validateWith } from "@/app/lib/actionHelper";
import {
  LOCALES,
  LOCALE_COOKIE,
  localeCookieOptions,
} from "@/app/lib/i18n/locale";
import { isSecureServerRequest } from "@/app/lib/http/secureCookie";

const setLocaleSchema = z.object({ locale: z.enum(LOCALES) });

/** The customer's language choice (the first-visit sheet, the top-bar
 *  switch): sets the NEXT_LOCALE cookie for this device — nothing else,
 *  no user data. The client then refreshes, so the server renders the
 *  page again in the new language. No session needed. */
export async function setLocaleAction(locale: string) {
  const result = validateWith(setLocaleSchema, { locale });
  if (result.isOk()) {
    const store = await cookies();
    store.set(
      LOCALE_COOKIE,
      result.value.locale,
      localeCookieOptions(await isSecureServerRequest()),
    );
  }
  return toActionResult(result);
}
