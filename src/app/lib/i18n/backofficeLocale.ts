import {
  LOCALE_COOKIE,
  parseLocale,
  type AppLocale,
} from "./locale";

/**
 * The staff's language — the Backoffice, /print and the sign-in pages
 * ("the staff surface"). Its own cookie, BO_LOCALE, separate from the
 * customers' NEXT_LOCALE: a shop tablet may be used by both. Read on the
 * server (src/i18n/request.ts), so the first render is already right.
 * Pure and client-safe.
 */

export const BACKOFFICE_LOCALE_COOKIE = "BO_LOCALE";

/** English first: the Backoffice was English-only until #98. */
const DEFAULT_BACKOFFICE_LOCALE: AppLocale = "en";

/** A BO_LOCALE cookie value as a locale: "my" only when that's what's
 *  stored; anything else (missing, empty, garbage) → English. */
export function parseBackofficeLocale(value: string | null | undefined): AppLocale {
  return value === "my" ? "my" : DEFAULT_BACKOFFICE_LOCALE;
}

/**
 * Which side of the app a request renders. next-intl's request config
 * can't see the pathname, so src/proxy.ts (which already matches the
 * staff routes) puts the surface on a request header for it.
 */
type AppSurface = "staff" | "storefront";

export const APP_SURFACE_HEADER = "x-app-surface";

/** The paths whose words follow BO_LOCALE — exactly the ones the proxy
 *  matches (its `config.matcher`). */
const STAFF_PATH_PREFIXES = ["/backoffice", "/print", "/auth"] as const;

/** The surface a pathname belongs to: a staff prefix (the path itself or
 *  anything under it — never "/backofficeX") → staff; else storefront. */
export function surfaceForPath(pathname: string): AppSurface {
  return STAFF_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
    ? "staff"
    : "storefront";
}

/** The header's value as a surface: only the exact "staff" is staff.
 *  A request the proxy never saw (a customer page) has no header. */
export function parseAppSurface(value: string | null | undefined): AppSurface {
  return value === "staff" ? "staff" : "storefront";
}

/** The language a request renders in: the surface picks the cookie (and
 *  its default), the cookie's value picks the language. */
export function localeForSurface(
  surface: AppSurface,
  readCookie: (name: string) => string | undefined,
): AppLocale {
  return surface === "staff"
    ? parseBackofficeLocale(readCookie(BACKOFFICE_LOCALE_COOKIE))
    : parseLocale(readCookie(LOCALE_COOKIE));
}
