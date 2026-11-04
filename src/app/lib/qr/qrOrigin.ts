import { config } from "@/app/utils/config";

/** The origin the shop's printed QR codes point to — config.mainUrl
 *  (NEXTAUTH_URL, the in-shop LAN address; TableService
 *  .buildQrCodeContent uses the same one). Printed on every QR, so not a
 *  secret: the cart page hands it to the in-app scanner, which accepts a
 *  counter QR from this origin too (lib/storefront/counterQrScan). Null
 *  when it isn't set to a valid URL. Server-only (reads the config). */
export function qrCodeOrigin(): string | null {
  try {
    return new URL(config.mainUrl).origin;
  } catch {
    return null;
  }
}
