import sharp from "sharp";
import { ValidationError } from "@/app/lib/errors";
import {
  UPLOAD_IMAGE_ERROR,
  asUploadImageFormat,
  imageContentType,
} from "./imageFormat";

/**
 * THE check every image upload goes through before it's stored or used
 * (MenuService.saveMenuImage, TableService.regenerateQrImage's logo):
 * opens the bytes with sharp and refuses anything that isn't really a
 * JPEG, PNG or WebP (whatever the browser said its type was) with a
 * ValidationError. A real image is re-encoded in its own format — turned
 * upright first (EXIF orientation), then saved without its metadata
 * (camera, GPS) — so what's stored is a clean image. Server only.
 */
export async function cleanImageUpload(
  input: Buffer,
): Promise<{ buffer: Buffer; contentType: string }> {
  const format = await sharp(input)
    .metadata()
    .then((metadata) => asUploadImageFormat(metadata.format))
    .catch(() => null); // not an image sharp can read at all
  if (format === null) throw new ValidationError(UPLOAD_IMAGE_ERROR, "IMAGE_INVALID");

  const buffer = await sharp(input).rotate().toFormat(format).toBuffer();
  return { buffer, contentType: imageContentType(format) };
}
