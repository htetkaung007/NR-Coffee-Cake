import { isAssetKey } from "./assetKey";

/**
 * Stored images (MenuImage.imageKey, Table.qrImageKey) are KEYS, never
 * URLs. The browser loads them from this app's own /assets/<key> route
 * (app/assets/[...key]/route.ts), so the address the phone used (LAN IP,
 * tunnel) and the storage provider never end up in the database — no
 * re-basing, nothing to rewrite when either changes. Pure and
 * client-safe.
 */

/** A stored key as the browser should load it: the relative URL
 *  `/assets/<key>`. null for no image, and for anything that isn't one
 *  of our keys (the route would 404 it anyway). */
export function resolveAssetUrl(key: string | null): string | null {
  if (!key || !isAssetKey(key)) return null;
  return `/assets/${key}`;
}

/** A menu's main photo URL from the `menuImages` its query selected
 *  (MAIN_MENU_IMAGE — the position-0 row only); null when it has none. */
export function mainImageUrl(
  menuImages: readonly { imageKey: string }[],
): string | null {
  return resolveAssetUrl(menuImages[0]?.imageKey ?? null);
}

/** One of a menu's photos as screens get it — its id (the edit form
 *  says "keep this one"), URL and position; never the stored key. */
export interface MenuImageView {
  id: number;
  url: string;
  position: number;
}

/** A menu's photos (MENU_IMAGES rows) in position order, as views;
 *  a row whose key isn't one of ours is left out. */
export function toMenuImages(
  rows: readonly { id: number; imageKey: string; position: number }[],
): MenuImageView[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .flatMap((row) => {
      const url = resolveAssetUrl(row.imageKey);
      return url === null ? [] : [{ id: row.id, url, position: row.position }];
    });
}
