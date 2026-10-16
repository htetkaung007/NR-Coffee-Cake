/**
 * Customer languages (the storefront only — the Backoffice is English).
 * The choice lives in the NEXT_LOCALE cookie, read on the server
 * (src/i18n/request.ts), so the first render is already in the right
 * language. Pure and client-safe.
 */

export const LOCALES = ["my", "en"] as const;
export type AppLocale = (typeof LOCALES)[number];

/** The `lang` attribute for text in `locale` inside an English page:
 *  "my" for Myanmar, nothing otherwise (the page's own lang applies). */
export function langAttr(
  locale: string | null | undefined,
): "my" | undefined {
  return locale === "my" ? "my" : undefined;
}

/** Myanmar first: most customers read Burmese. */
export const DEFAULT_LOCALE: AppLocale = "my";

export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Each language's name in ITSELF — what the language sheet and the
 *  top-bar switch show (never translated). */
export const LANGUAGE_NAMES: Record<AppLocale, string> = {
  my: "မြန်မာ",
  en: "English",
};

/** The top-bar switch's short label for each language. */
export const SHORT_LANGUAGE_NAMES: Record<AppLocale, string> = {
  my: "မြန်မာ",
  en: "EN",
};

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/** Set-Cookie options for LOCALE_COOKIE — a per-device setting, kept a
 *  year. Readable by the server only when sent, so httpOnly is fine.
 *  `secure` comes from the request (lib/http/secureCookie): https only —
 *  on the http shop LAN a secure cookie would be dropped. */
export function localeCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  };
}

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** A cookie value as a locale: one of LOCALES, else DEFAULT_LOCALE
 *  (missing, empty or anything else). */
export function parseLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}
