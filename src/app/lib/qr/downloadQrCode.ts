/**
 * Downloads an image URL as a file, using the browser's native anchor
 * download rather than a library — the same "no new dependency for a
 * one-line browser API" approach as handlePrintQrCode. Fetches first
 * (rather than pointing the anchor straight at the URL) so this works
 * even when the storage provider serves the image without a
 * Content-Disposition header, which would otherwise open it in a new
 * tab instead of downloading it.
 */
export async function downloadQrCode(
  qrcodeImageUrl: string,
  tableName: string,
) {
  const response = await fetch(qrcodeImageUrl);
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `${tableName.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(objectUrl);
}
