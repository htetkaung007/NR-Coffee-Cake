import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { relativePath } from "@/app/lib/http/redirect";

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
    // The callbackUrl is a RELATIVE path — request.url carries the
    // server's own host (localhost under `next start`), not the address
    // the browser used. The proxy layer needs an absolute redirect URL,
    // but Next sends a same-host one as a relative Location itself.
    const signInPath = relativePath("/auth/signIn", {
      callbackUrl: `${request.nextUrl.pathname}${request.nextUrl.search}`,
    });
    return NextResponse.redirect(new URL(signInPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  // /print/... is the Backoffice's printable bill — outside the
  // Backoffice layout, but the same staff-only access.
  matcher: ["/backoffice/:path*", "/print/:path*"],
};
