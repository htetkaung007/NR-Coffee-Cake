/**
 * The online menu's link — the customer menu page itself
 * (/menu?locationId=<id>); who may see it is lib/storefront/menuAccess.
 * Pure and client-safe.
 */

/** The link as Settings shows it: the full URL when the public base URL
 *  is configured (config.publicBaseUrl), else the path only (which works
 *  only inside the shop). A trailing slash on the base is ignored. */
export function onlineMenuLink(locationId: number, publicBaseUrl: string): string {
  const base = publicBaseUrl.trim().replace(/\/+$/, "");
  return `${base}/menu?locationId=${locationId}`;
}
