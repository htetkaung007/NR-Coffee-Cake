/** The route a printed counter QR points to (see (storefront)/counter/route.ts). */
const COUNTER_QR_PATH = "/counter";

/** Why the in-app scanner can't use the camera — each gets its own
 *  explanation and phone-camera fallback (see CounterQrScannerDialog). */
export type CameraFailure =
  | "permissionDenied"
  | "noCamera"
  | "cameraBusy"
  | "insecureContext"
  | "loadFailed"
  | "unknown";

/**
 * Scanned QR text, accepted ONLY if it's this shop's counter QR: same
 * origin as the page (scheme, host and port), the counter route, and a
 * non-empty `key`. Anything else — another site, another page, a
 * `javascript:` URL, plain text — is null and must not be navigated to.
 * The key itself is still checked by the route handler, as for a scan
 * with the phone's own camera.
 */
export function parseCounterQrUrl(text: string, origin: string): URL | null {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  const isCounterQr =
    url.origin === origin &&
    url.pathname === COUNTER_QR_PATH &&
    (url.searchParams.get("key") ?? "") !== "";
  return isCounterQr ? url : null;
}

/** A getUserMedia rejection (a DOMException, by name) as a failure the
 *  customer can be told about. */
export function classifyCameraError(error: unknown): CameraFailure {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : "";
  switch (name) {
    case "NotAllowedError":
      return "permissionDenied";
    case "NotFoundError":
    case "OverconstrainedError":
      return "noCamera";
    case "NotReadableError":
      return "cameraBusy";
    default:
      return "unknown";
  }
}
