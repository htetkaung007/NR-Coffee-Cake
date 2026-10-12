import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * The sign-in redirect for staff pages (/backoffice and /print): no
 * NextAuth token → the sign-in page, with the page as the callbackUrl.
 * Only a coarse first check — every page and action still runs its own
 * guard (lib/access/roleGuard). Customer pages (/menu, /cart …) aren't
 * matched: who may see them is decided by the pages themselves
 * (lib/storefront/menuAccess).
 */
export default async function proxy(request: NextRequest) {
  return guardBackoffice(request);
}

async function guardBackoffice(request: NextRequest) {
  const token = await getToken({ req: request });

  if (!token) {
    const signInUrl = new URL("/auth/signIn", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  // /print/... is the Backoffice's printable bill — outside the
  // Backoffice layout, but the same staff-only access.
  matcher: ["/backoffice/:path*", "/print/:path*"],
};
