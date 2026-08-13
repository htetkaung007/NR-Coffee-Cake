import QRCode from "qrcode";
import sharp from "sharp";

const QR_WIDTH = 512;
// Logos larger than ~20-25% of the QR code's width start covering too
// much of the finder/timing pattern for scanners to read reliably —
// 100px (~20% of 512px) stays well inside the safe range while still
// being clearly visible once printed.
const LOGO_WIDTH = 100;

// Inline SVG so no static asset file needs to ship alongside the
// server bundle — sharp accepts an SVG buffer directly, same as any
// other image format, so this composites exactly like a real upload
// would. Mirrors MUI's TableRestaurantOutlined glyph at a glance
// (simple table-top + legs), good enough for a fallback mark that's
// only ever shown shrunk to 100px in the middle of a QR code.
const DEFAULT_TABLE_ICON_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${LOGO_WIDTH}" height="${LOGO_WIDTH}">
  <rect width="24" height="24" fill="white"/>
  <rect x="3" y="7" width="18" height="3" fill="#4b3621"/>
  <rect x="5" y="10" width="2" height="8" fill="#4b3621"/>
  <rect x="17" y="10" width="2" height="8" fill="#4b3621"/>
</svg>
`;

// A solid circle the same size as the logo. Used twice: once as a
// white backing disc (so a transparent-background logo still shows a
// clean circle, not the QR pattern showing through gaps), and once as
// an alpha mask (blend: "dest-in") that clips the logo's square
// corners away, leaving only the circular area visible. Most uploaded
// logos are square/rectangular photos, so without this mask their
// corners would sit on top of the QR code as a visible square block.
const CIRCLE_MASK_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="${LOGO_WIDTH}" height="${LOGO_WIDTH}">
  <circle cx="${LOGO_WIDTH / 2}" cy="${LOGO_WIDTH / 2}" r="${LOGO_WIDTH / 2}" fill="white"/>
</svg>
`;

/**
 * Resizes an image to fill LOGO_WIDTH x LOGO_WIDTH and clips it to a
 * circle. Does one thing: takes raw image bytes in, returns a
 * circular PNG out — no knowledge of where the bytes came from
 * (upload vs. default icon).
 */
async function toCircularLogo(imageBuffer: Buffer): Promise<Buffer> {
  const squared = await sharp(imageBuffer)
    .resize(LOGO_WIDTH, LOGO_WIDTH, { fit: "cover" }) // "cover" fills the circle edge-to-edge, unlike "contain" which would leave corners empty
    .png()
    .toBuffer();

  const circleMask = Buffer.from(CIRCLE_MASK_SVG);

  return sharp(squared)
    .composite([{ input: circleMask, blend: "dest-in" }]) // keeps only the pixels inside the circle
    .png()
    .toBuffer();
}

/**
 * Generates a QR code PNG with a small circular logo composited in
 * the center. If logoBuffer is omitted (user didn't upload one),
 * falls back to a default table icon so every table's QR code still
 * gets a mark in the middle, not just the ones with a custom logo.
 *
 * Does one thing (Clean Code): callers pass in already-validated image
 * bytes and get back a finished PNG buffer — no knowledge of Zod,
 * FormData, or the Table domain leaks into this function.
 */
export async function generateQrCodeWithLogo(
  qrContent: string,
  logoBuffer: Buffer | null,
): Promise<Buffer> {
  const qrBuffer = await QRCode.toBuffer(qrContent, {
    type: "png",
    width: QR_WIDTH,
    errorCorrectionLevel: "H", // highest correction — needed since part of the code is covered by the logo
  });

  const circularLogo = await toCircularLogo(
    logoBuffer ?? Buffer.from(DEFAULT_TABLE_ICON_SVG),
  );

  // White circular backing sits under the logo so the disc reads
  // cleanly against the QR code's black/white pattern, then the
  // circular logo composites on top of that.
  const whiteBacking = await sharp(Buffer.from(CIRCLE_MASK_SVG))
    .png()
    .toBuffer();

  return sharp(qrBuffer)
    .composite([
      { input: whiteBacking, gravity: "center" },
      { input: circularLogo, gravity: "center" },
    ])
    .png()
    .toBuffer();
}
