import { headers } from "next/headers";
import type { NextRequest } from "next/server";

/**
 * Whether a cookie we set should be `secure` — decided by the REQUEST,
 * never by NODE_ENV. The shop LAN is plain http (a `secure` cookie
 * there is dropped by the browser: the language never changes, a QR
 * scan keeps no session), a tunnel / proxy in front is https.
 *
 * https = the request URL's own protocol, or — behind a proxy or tunnel
 * that ends TLS — its `x-forwarded-proto` header (the first value when
 * a chain of proxies lists several). A spoofed header only ever hurts
 * the sender: their own browser drops the cookie.
 *
 * Pure — the two variants below only gather the facts.
 */
export function isHttpsRequest(facts: {
  protocol?: string | null;
  forwardedProto?: string | null;
}): boolean {
  const forwarded = facts.forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (forwarded) return forwarded === "https";
  return facts.protocol?.trim().toLowerCase() === "https:";
}

/** For Route Handlers: `response.cookies.set(name, value,
 *  { ...options, secure: isSecureRequest(request) })`. */
export function isSecureRequest(request: NextRequest): boolean {
  return isHttpsRequest({
    protocol: request.nextUrl.protocol,
    forwardedProto: request.headers.get("x-forwarded-proto"),
  });
}

/** For Server Actions (and anything else rendered on the server):
 *  there's no request URL, so the scheme comes from the headers — the
 *  `x-forwarded-proto` the Next server (or a proxy) sets, else the
 *  `origin` a Server Action POST always carries. */
export async function isSecureServerRequest(): Promise<boolean> {
  const list = await headers();
  return isHttpsRequest({
    protocol: originProtocol(list.get("origin")),
    forwardedProto: list.get("x-forwarded-proto"),
  });
}

function originProtocol(origin: string | null): string | null {
  if (!origin) return null;
  try {
    return new URL(origin).protocol;
  } catch {
    return null;
  }
}
