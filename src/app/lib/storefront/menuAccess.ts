/**
 * Who may see a location's customer menu (/menu?locationId=…) — the
 * online menu IS that page. Pure: the facts are gathered on the server
 * (lib/storefront/menuAccessCheck.ts) and every place that shows menu
 * data without a QR session asks this first. Ordering is never decided
 * here — sending always needs the QR session.
 */

import { z } from "zod";

export type MenuAccess = "menu" | "unavailable";

const idParamSchema = z.coerce.number().int().positive();

/** An id from a customer URL (`locationId`, `tableId` — untrusted): a
 *  positive whole number, or null — never NaN, 0 or a fraction reaching
 *  a lookup. */
export function parseIdParam(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw.trim() === "") return null;
  const parsed = idParamSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function menuAccess(facts: {
  /** A valid QR session for THIS location: the Counter cookie's session,
   *  or a current Table contributor token for a table here. */
  hasQrSession: boolean;
  /** Location.onlineMenuEnabled — the owner's switch. */
  onlineMenuEnabled: boolean;
  locationExists: boolean;
  isArchived: boolean;
}): MenuAccess {
  // A missing or closed location has no menu for anyone.
  if (!facts.locationExists || facts.isArchived) return "unavailable";
  // Scanned in the shop: the menu works as always, on or off.
  if (facts.hasQrSession) return "menu";
  // Not scanned: only while the owner has the online menu on.
  return facts.onlineMenuEnabled ? "menu" : "unavailable";
}
