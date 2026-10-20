import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { relativePath } from "@/app/lib/http/redirect";
import {
  APP_SURFACE_HEADER,
  surfaceForPath,
} from "@/app/lib/i18n/backofficeLocale";

/**
 * Two jobs for the staff routes (/backoffice, /print and /auth):
 *
 * 1. The staff surface header (lib/i18n/backofficeLocale): next-intl's
 *    request config (src/i18n/request.ts) can't see the pathname, so the
 *    proxy tells it — `x-app-surface: staff` — and it reads the staff
 *    language (BO_LOCALE) instead of the customers' (NEXT_LOCALE). A
 *    client's own copy of the header is always overwritten here; on a
 *    customer page (never matched) a forged one could only change which
 *    of the sender's OWN cookies picks the language of their own page.
 *
 * 2. The sign-in redirect for staff pages (/backoffice and /print): no
 *    NextAuth token → the sign-in page, with the page as the callbackUrl.
 *    Only a coarse first check — every page and action still runs its
 *    own guard (lib/access/roleGuard). /auth itself is never redirected.
 *    Customer pages (/menu, /cart …) aren't matched: who may see them is
 *    decided by the pages themselves (lib/storefront/menuAccess).
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/auth")) {
    const redirect = await signInRedirect(request);
    if (redirect) return redirect;
  }
  const headers = new Headers(request.headers);
  headers.set(APP_SURFACE_HEADER, surfaceForPath(pathname));
  return NextResponse.next({ request: { headers } });
}

async function signInRedirect(request: NextRequest) {
  const token = await getToken({ req: request });
  if (token) return null;

  // The callbackUrl is a RELATIVE path — request.url carries the
  // server's own host (localhost under `next start`), not the address
  // the browser used. The proxy layer needs an absolute redirect URL,
  // but Next sends a same-host one as a relative Location itself.
  const signInPath = relativePath("/auth/signIn", {
    callbackUrl: `${request.nextUrl.pathname}${request.nextUrl.search}`,
  });
  return NextResponse.redirect(new URL(signInPath, request.url));
}

export const config = {
  // /print/... is the Backoffice's printable bill — outside the
  // Backoffice layout, but the same staff-only access. /auth/... (sign
  // in / sign up) only gets the staff surface header.
  matcher: ["/backoffice/:path*", "/print/:path*", "/auth/:path*"],
};
