/**
 * How big uploads may be — ONE place for the per-image limit the Zod
 * schemas check and the request-body limit next.config.ts sets. Pure (no
 * imports): next.config.ts imports it directly.
 */

/** One image (menu photo, QR logo), as the browser sends it — before
 *  cleanImageUpload shrinks a menu photo to ≤ 1200px WebP. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Photos per menu (#109 sends them all in one save). */
export const MAX_MENU_IMAGES = 3;

/** Room for the rest of a form (names, ids, …) beside its images. */
const FORM_FIELDS_BYTES = 1024 * 1024;

/**
 * The largest request body Next accepts — set on BOTH limits in
 * next.config.ts: serverActions.bodySizeLimit (Next's default is 1 MB,
 * which refuses one phone photo) and proxyClientMaxBodySize (src/proxy.ts
 * runs on /backoffice, and its 10 MB default would cut a 3-photo save
 * short). One menu save = 3 × 5 MB + 1 MB = 16 MB.
 *
 * NOTE: this applies to EVERY Server Action, not just uploads (Next has
 * no per-action limit). Fine while the app is only on the shop LAN —
 * revisit when the online menu goes public through a tunnel (a smaller
 * global limit, uploading photos one by one).
 */
export const UPLOAD_BODY_LIMIT_BYTES =
  MAX_MENU_IMAGES * MAX_IMAGE_BYTES + FORM_FIELDS_BYTES;
