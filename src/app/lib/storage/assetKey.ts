/**
 * The ONE shape of a stored file's key — what the database holds
 * (MenuImage.imageKey, Table.qrImageKey), what every storage provider
 * writes under, and what the /assets route accepts. Pure and
 * client-safe (no config, no Node APIs).
 *
 *   menu/<menuId>-<timestamp>-<8 hex>.webp   (a menu photo, always WebP)
 *   table/<tableId>-<timestamp>-<8 hex>.png  (a table's QR image)
 *
 * A new upload always gets a new key (timestamp + random suffix — two
 * photos saved in the same millisecond still differ), so a key's bytes
 * never change: the route can cache them "immutable".
 */

const EXTENSIONS = { menu: "webp", table: "png" } as const;

export type AssetFolder = keyof typeof EXTENSIONS;

const CONTENT_TYPES: Record<(typeof EXTENSIONS)[AssetFolder], string> = {
  webp: "image/webp",
  png: "image/png",
};

/** The allowlist: each folder with its own extension only, a positive
 *  id, a 13-digit millisecond timestamp, 8 lowercase hex. Nothing else —
 *  no "..", no "/" beyond the folder's, no other folder or extension. */
const ASSET_KEY_PATTERN =
  /^(?:menu\/[1-9]\d{0,9}-\d{13}-[0-9a-f]{8}\.webp|table\/[1-9]\d{0,9}-\d{13}-[0-9a-f]{8}\.png)$/;

function randomSuffix(): string {
  const bytes = new Uint8Array(4);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** A new key for a file of `folder` belonging to entity `id`. `now` and
 *  `suffix` are parameters for tests; callers leave them out. */
export function buildAssetKey(
  folder: AssetFolder,
  id: number,
  now: number = Date.now(),
  suffix: string = randomSuffix(),
): string {
  return `${folder}/${id}-${now}-${suffix}.${EXTENSIONS[folder]}`;
}

/** Is `key` exactly the shape buildAssetKey makes? */
export function isAssetKey(key: string): boolean {
  return ASSET_KEY_PATTERN.test(key);
}

/** The Content-Type a stored key is served with. Only call it with a key
 *  isAssetKey accepted. */
export function assetContentType(key: string): string {
  return key.endsWith(".png") ? CONTENT_TYPES.png : CONTENT_TYPES.webp;
}
