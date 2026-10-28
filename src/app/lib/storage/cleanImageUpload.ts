import sharp from "sharp";
import { ValidationError } from "@/app/lib/errors";
import {
  UPLOAD_IMAGE_ERROR,
  asUploadImageFormat,
  imageContentType,
} from "./imageFormat";

/** A menu photo is stored at most this wide (CSS px of a 2× phone
 *  screen's detail photo); a smaller one is never enlarged. */
export const MENU_PHOTO_MAX_WIDTH = 1200;
const MENU_PHOTO_WEBP_QUALITY = 80;

/** What the upload is for: a menu photo (resized, stored as WebP) or the
 *  logo composited into a table's QR PNG (kept in its own format — the
 *  QR image is drawn from it, lib/qr/qrCode). */
export type ImageUploadKind = "menuPhoto" | "qrLogo";

/**
 * THE check every image upload goes through before it's stored or used
 * (MenuService.saveMenuImages, TableService.regenerateQrImage's logo):
 * opens the bytes with sharp and refuses anything that isn't really a
 * JPEG, PNG or WebP (whatever the browser said its type was) with a
 * ValidationError. A real image is turned upright first (EXIF
 * orientation) and re-encoded without its metadata (camera, GPS — sharp
 * drops it unless asked to keep it), so what's stored is a clean image:
 * - a menu photo: at most MENU_PHOTO_MAX_WIDTH wide (aspect ratio kept),
 *   WebP quality 80 — its key ends in .webp (lib/storage/assetKey);
 * - a QR logo: its own format, its own size.
 * Server only.
 */
export async function cleanImageUpload(
  input: Buffer,
  kind: ImageUploadKind,
): Promise<{ buffer: Buffer; contentType: string }> {
  const format = await sharp(input)
    .metadata()
    .then((metadata) => asUploadImageFormat(metadata.format))
    .catch(() => null); // not an image sharp can read at all
  if (format === null) throw new ValidationError(UPLOAD_IMAGE_ERROR, "IMAGE_INVALID");

  const upright = sharp(input).rotate();
  if (kind === "qrLogo") {
    const buffer = await upright.toFormat(format).toBuffer();
    return { buffer, contentType: imageContentType(format) };
  }
  const buffer = await upright
    .resize({ width: MENU_PHOTO_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: MENU_PHOTO_WEBP_QUALITY })
    .toBuffer();
  return { buffer, contentType: imageContentType("webp") };
}
