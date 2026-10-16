import { config } from "@/app/utils/config";

/**
 * Stored image URLs (Menu.assetUrl, Table.qrcodeImageUrl) hold the FULL
 * address from upload time — `${MINIO_ENDPOINT}/${bucket}/${key}`. When
 * the storage address changes (localhost → the shop's LAN IP, a new IP)
 * those old URLs stop loading. Rather than rewriting the database, every
 * stored URL is re-based onto the CURRENT address on its way out.
 *
 * The object key is whatever follows `/${bucket}/` — the one rule both
 * resolveAssetUrl (display) and S3CompatibleStorageService.delete use,
 * so an image uploaded under an old address can still be deleted.
 */

/** The object key inside `bucket` that a stored URL points to, or null
 *  when it isn't one of ours (no `/${bucket}/` after the host, not an
 *  http(s) URL, empty). Pure. */
export function assetKeyFromUrl(stored: string, bucket: string): string | null {
  if (!bucket) return null;
  const scheme = /^https?:\/\//i.exec(stored);
  if (!scheme) return null;
  const marker = `/${bucket}/`;
  const at = stored.indexOf(marker, scheme[0].length);
  if (at === -1) return null;
  const key = stored.slice(at + marker.length);
  return key === "" ? null : key;
}

/** `stored` re-based onto `endpoint` (the current storage address) when
 *  it points into `bucket`; anything else unchanged ("" stays ""). Pure. */
export function rebaseAssetUrl(
  stored: string,
  endpoint: string,
  bucket: string,
): string {
  if (!endpoint) return stored;
  const key = assetKeyFromUrl(stored, bucket);
  if (key === null) return stored;
  return `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}`;
}

/** A stored asset URL as the browser should load it today — call it
 *  wherever one leaves the server for display. Server-side only (the
 *  storage address isn't public config); null stays null. */
export function resolveAssetUrl(stored: string): string;
export function resolveAssetUrl(stored: string | null): string | null;
export function resolveAssetUrl(stored: string | null): string | null {
  if (stored === null) return null;
  return rebaseAssetUrl(stored, config.minioEndpoint, config.minioBucket);
}
