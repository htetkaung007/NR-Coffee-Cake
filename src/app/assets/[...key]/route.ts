import { assetContentType, isAssetKey } from "@/app/lib/storage/assetKey";
import { getFileStorageService } from "@/app/lib/storage/getFileStorageService";

/**
 * GET /assets/<key> — every stored image (menu photos, table QR codes) as
 * the browser loads it (lib/storage/assetUrl). Public on purpose: menu
 * photos show on the customer menu without a sign-in (src/proxy.ts's
 * matcher leaves /assets out).
 *
 * Only a key of the exact shape we generate is looked up
 * (lib/storage/assetKey's allowlist: folder, id, timestamp, suffix,
 * extension); anything else is the same bare 404 as a missing file. The
 * storage provider guards its own root again (LocalFileStorageService
 * resolves the path and refuses one outside UPLOAD_DIR). The file is
 * streamed — never read whole into memory.
 *
 * A key's bytes never change (a new upload always gets a new key), so it
 * may be cached for a year, "immutable".
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ key: string[] }> },
) {
  const { key: segments } = await context.params;
  const key = segments.join("/");
  if (!isAssetKey(key)) return notFound();

  const file = await getFileStorageService().open(key);
  if (file === null) return notFound();

  return new Response(file.body, {
    status: 200,
    headers: {
      "Content-Type": assetContentType(key),
      "Content-Length": String(file.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function notFound() {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}
