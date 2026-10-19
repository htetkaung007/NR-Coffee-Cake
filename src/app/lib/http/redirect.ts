import { NextResponse } from "next/server";
import { isAppPath } from "./appPath";

/**
 * Redirects from Route Handlers — always with a RELATIVE Location
 * ("/menu?locationId=1"), never an absolute URL built from request.url.
 * Under `next start`, request.url carries the server's own host
 * (localhost), not the address the phone used (the LAN IP, a tunnel
 * domain), so an absolute redirect sent a scanned phone to "localhost".
 * A relative Location keeps whatever host the browser used. Cookies set
 * on the returned response work as usual.
 *
 * Not for src/proxy.ts: Next's proxy layer parses a redirect's Location
 * as an absolute URL (and itself turns a same-host one into a relative
 * one) — there, only the callbackUrl needs to be a relative path.
 */

type Query = Record<string, string | number | null | undefined>;

/** "/path?a=1&b=2" — the query in the given order, empty / null values
 *  left out. Only an app path (one leading "/", never "//host"), so no
 *  redirect can leave the site. Pure. */
export function relativePath(pathname: string, query: Query = {}): string {
  if (!isAppPath(pathname)) {
    throw new Error(`Not an app path: ${pathname}`);
  }
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

/** A redirect response to `path` (from relativePath) — 307 like
 *  NextResponse.redirect's default, or 303. */
export function redirectTo(path: string, status: 303 | 307 = 307): NextResponse {
  if (!isAppPath(path)) {
    throw new Error(`Not an app path: ${path}`);
  }
  return new NextResponse(null, { status, headers: { Location: path } });
}
