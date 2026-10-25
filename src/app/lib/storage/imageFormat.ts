/**
 * Which image formats an upload may be (menu photos, the QR-centre logo)
 * — decided from the file's CONTENT (sharp's reading of the bytes, see
 * cleanImageUpload), never from the browser-sent `file.type`. Pure.
 */

const UPLOAD_IMAGE_FORMATS = ["jpeg", "png", "webp"] as const;
export type UploadImageFormat = (typeof UPLOAD_IMAGE_FORMATS)[number];

export const UPLOAD_IMAGE_ERROR = "Image must be a PNG, JPEG, or WEBP file.";

const CONTENT_TYPES: Record<UploadImageFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

/** The format if it's one an upload may be; anything else (svg, gif,
 *  heif, unreadable → undefined) → null. */
export function asUploadImageFormat(
  format: string | undefined,
): UploadImageFormat | null {
  return (UPLOAD_IMAGE_FORMATS as readonly string[]).includes(format ?? "")
    ? (format as UploadImageFormat)
    : null;
}

/** The Content-Type a stored image of `format` is served with. */
export function imageContentType(format: UploadImageFormat): string {
  return CONTENT_TYPES[format];
}
