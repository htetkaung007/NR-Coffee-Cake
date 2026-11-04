import { readQrScanParams } from "./qrScanParams";

/** The routes the printed QR codes point to (see (storefront)/counter
 *  /route.ts and (storefront)/table/route.ts). */
const COUNTER_QR_PATH = "/counter";
const TABLE_QR_PATH = "/table";

/** Why the in-app scanner can't use the camera — each gets its own
 *  explanation and phone-camera fallback (see CounterQrScannerDialog). */
export type CameraFailure =
  | "permissionDenied"
  | "noCamera"
  | "cameraBusy"
  | "insecureContext"
  | "loadFailed"
  | "unknown";

/** What the in-app scanner read, and what the customer is told. */
export type ScannedCode =
  /** This shop's counter QR — `url` is the ONLY place the scanner may go. */
  | { kind: "counter"; url: URL }
  /** A table's QR (`/table` + a key, any address) — words only. */
  | { kind: "tableQr" }
  /** A counter link (`/counter` + a key) on an address that's neither
   *  this page's nor the one the shop's QR codes are made with. */
  | { kind: "otherAddress" }
  /** Anything else: another site, another page, plain text. */
  | { kind: "otherCode" };

/**
 * Sorts scanned QR text (never trusted). Only http(s) URLs count.
 *
 * A counter QR is accepted from the CURRENT origin or from `qrOrigin`,
 * the address the shop's QR codes are printed with (config.mainUrl —
 * the LAN address, while the camera only runs on the https tunnel page).
 * Either way the scanner goes to `/counter` on the CURRENT origin with
 * only `locationId`, `tableId` and `key` (read as the route reads them —
 * readQrScanParams): the route sets the scan cookie for THIS origin and
 * the cart, kept in this origin's localStorage, stays. The key itself
 * is still checked by the route handler, as for a phone-camera scan.
 * Pure.
 */
export function classifyScannedCode(
  text: string,
  origins: { currentOrigin: string; qrOrigin: string | null },
): ScannedCode {
  let scanned: URL;
  try {
    scanned = new URL(text);
  } catch {
    return { kind: "otherCode" };
  }
  if (scanned.protocol !== "https:" && scanned.protocol !== "http:") {
    return { kind: "otherCode" };
  }
  const params = readQrScanParams(scanned.searchParams);
  if (params.key === null) return { kind: "otherCode" };

  if (scanned.pathname === TABLE_QR_PATH) return { kind: "tableQr" };
  if (scanned.pathname !== COUNTER_QR_PATH) return { kind: "otherCode" };

  const isOurs =
    scanned.origin === origins.currentOrigin ||
    scanned.origin === origins.qrOrigin;
  if (!isOurs) return { kind: "otherAddress" };

  const url = new URL(COUNTER_QR_PATH, origins.currentOrigin);
  if (params.locationId !== null) {
    url.searchParams.set("locationId", String(params.locationId));
  }
  if (params.tableId !== null) {
    url.searchParams.set("tableId", String(params.tableId));
  }
  url.searchParams.set("key", params.key);
  return { kind: "counter", url };
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
